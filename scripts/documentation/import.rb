#!/usr/bin/env ruby
# SPDX-FileCopyrightText: 2026 the Folio Project
# SPDX-License-Identifier: MIT

require 'digest'
require 'fileutils'
require 'json'
require 'open3'
require 'optparse'
require 'tmpdir'

module FolioDocumentation
  module_function

  def check(condition, message)
    raise ArgumentError, message unless condition
  end

  # Byte-compatible with the UndoKit producer's tree checksum format.
  def tree_hash(root)
    check(File.directory?(root), "missing directory: #{root}")
    digest = Digest::SHA256.new
    Dir.glob(File.join(root, '**', '*'), File::FNM_DOTMATCH).sort.each do |path|
      next if %w[. ..].include?(File.basename(path))
      check(!File.symlink?(path), "symlinks are not accepted: #{path}")
      relative = path.delete_prefix(root + '/')
      digest.update(File.directory?(path) ? "D\0#{relative}\0" : "F\0#{relative}\0#{Digest::SHA256.file(path).hexdigest}\0")
    end
    digest.hexdigest
  end

  def json(path)
    JSON.parse(File.read(path))
  end

  def write_json(path, value)
    File.write(path, JSON.pretty_generate(value) + "\n")
  end

  def command(*argv)
    stdout, stderr, status = Open3.capture3(*argv)
    check(status.success?, "#{argv.take(3).join(' ')} failed: #{stderr.strip}")
    stdout.strip
  end

  def transform(archive, site, base)
    command('xcrun', 'docc', 'process-archive', 'transform-for-static-hosting', archive,
            '--output-path', site, '--hosting-base-path', base.delete_suffix('/'))
    check(File.file?(File.join(site, 'documentation/undokit/index.html')), 'DocC output has no UndoKit module page')
    check(Dir.glob(File.join(site, 'js', '*.js')).any?, 'DocC output has no JavaScript')
    %w[index/index.json index/navigator.index data/documentation/undokit.json].each do |path|
      check(File.file?(File.join(site, path)), "DocC output is missing #{path}")
    end
    tree_hash(site)
    indexed_routes = []
    collect = lambda do |value|
      case value
      when Hash
        indexed_routes << value['path'] if value['path'].is_a?(String) && value['path'].start_with?('/')
        value.each_value { |child| collect.call(child) }
      when Array
        value.each { |child| collect.call(child) }
      end
    end
    collect.call(json(File.join(site, 'index/index.json')))
    check(!indexed_routes.empty?, 'DocC search index has no topic routes')
    indexed_routes.uniq.each do |route|
      relative = route.split(/[?#]/, 2).first.delete_prefix('/')
      check(!relative.split('/').include?('..'), 'indexed route escapes output')
      path = File.join(site, relative)
      path = File.join(path, 'index.html') if File.directory?(path)
      check(File.file?(path), "indexed topic has no deep-refresh page: #{route}")
    end
    target = "#{base}documentation/undokit/"
    File.write(File.join(site, 'index.html'), "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0; url=#{target}\"><title>UndoKit documentation</title></head><body><a href=\"#{target}\">Browse UndoKit documentation</a></body></html>\n")
    html_files = Dir.glob(File.join(site, '**', '*.html'))
    html_files.each do |path|
      html = File.read(path)
      check(html.match?(/<head\b[^>]*>/i), "HTML has no head: #{path}")
      html.scan(/(?:src|href)=["']([^"']+)["']/i).flatten.each do |url|
        next if url.start_with?('#', 'data:', 'http:', 'https:', 'mailto:', 'javascript:')
        clean = url.split(/[?#]/, 2).first
        next if clean.empty?
        if clean.start_with?('/')
          check(clean.start_with?(base), "asset escapes mount: #{url}")
          resolved = File.expand_path(clean.delete_prefix(base), site)
        else
          resolved = File.expand_path(clean, File.dirname(path))
        end
        check(resolved.start_with?(site + '/') || resolved == site, "asset escapes site: #{url}")
        resolved = File.join(resolved, 'index.html') if File.directory?(resolved)
        check(File.file?(resolved), "HTML resource has no static target: #{url}")
      end
      html.sub!(/<head\b[^>]*>/i) { |head| "#{head}<link rel=\"stylesheet\" href=\"/_documentation/undokit/selector.css\"><script defer src=\"/_documentation/undokit/selector.js\"></script>" }
      File.write(path, html)
    end
    routes = html_files.map { |path| path.delete_prefix(site + '/').sub(/index\.html\z/, '') }.sort
    [tree_hash(site), routes]
  end

  def import(options)
    artifact = File.expand_path(options.fetch(:artifact))
    release_path = File.expand_path(options.fetch(:release))
    output = File.expand_path(options.fetch(:output))
    check(!output.start_with?(artifact + '/') && !artifact.start_with?(output + '/') && artifact != output, 'artifact and output must be separate trees')
    manifest = json(File.join(artifact, 'manifest.json'))
    version = manifest.fetch('version')
    check(manifest['schemaVersion'] == 1 && version.match?(/\A\d+\.\d+\.\d+\z/), 'unsupported artifact schema or version')
    check(manifest['channel'] == 'release' && manifest['sourceDirty'] == false && !manifest.key?('documentationSourceCommit'), 'only original clean release artifacts may be imported')
    check(manifest.fetch('sourceCommit').match?(/\A[0-9a-f]{40}\z/), 'invalid source revision')
    check(manifest['basePath'] == "/UndoKit/versions/#{version}/", 'invalid artifact base path')
    check(manifest.values_at('archivePath', 'sitePath', 'producerPath') == %w[archive site producer.json], 'unsupported artifact paths')
    tree_hash(artifact)
    release = json(release_path)
    check(release['schemaVersion'] == 1 && release['releaseVersion'] == version && release['sourceCommit'] == manifest['sourceCommit'] && release['documentation'] == manifest, 'release manifest does not bind the complete documentation artifact')
    producer_path = File.join(artifact, 'producer.json')
    producer = json(producer_path)
    check(Digest::SHA256.file(producer_path).hexdigest == manifest['producerSHA256'], 'producer checksum mismatch')
    check(producer['schemaVersion'] == 1 && producer['sourceCommit'] == manifest['sourceCommit'] && producer['sourceDirty'] == false && producer['toolchain'] == manifest['toolchain'] && producer['command'] == manifest['producerCommand'] && producer['archiveTreeSHA256'] == manifest['archiveTreeSHA256'], 'producer identity mismatch')
    %w[archive site].each { |name| check(tree_hash(File.join(artifact, name)) == manifest["#{name}TreeSHA256"], "#{name} checksum mismatch") }
    FileUtils.mkdir_p(File.dirname(output))
    File.open(output + '.lock', File::RDWR | File::CREAT, 0o644) do |lock|
      check(lock.flock(File::LOCK_EX | File::LOCK_NB), 'another documentation import is running')
      check(!File.exist?(File.join(output, 'versions', version)), 'retained versions are immutable; this version is already imported')
      working = Dir.mktmpdir('.undokit-import-', File.dirname(output))
      backup = output + '.previous'
      begin
        if File.exist?(output)
          tree_hash(output)
          FileUtils.cp_r(output + '/.', working)
        end
        registry = File.file?(File.join(working, 'publication.json')) ? json(File.join(working, 'publication.json')) : { 'schemaVersion' => 1, 'versions' => [] }
        target = File.join(working, 'versions', version)
        FileUtils.mkdir_p(target)
        original = File.join(target, 'original')
        FileUtils.cp_r(artifact, original)
        FileUtils.cp(release_path, File.join(target, 'release-manifest.json'))
        transform_archive = File.join(working, '.transform.doccarchive')
        FileUtils.cp_r(File.join(original, 'archive'), transform_archive)
        docc_path = command('xcrun', '--find', 'docc')
        tool = { 'path' => docc_path, 'executableSHA256' => Digest::SHA256.file(docc_path).hexdigest,
                 'help' => command('xcrun', 'docc', '--help') }
        revision = command('git', '-C', File.expand_path('../..', __dir__), 'rev-parse', 'HEAD')
        base = "/UndoKit/versions/#{version}/"
        site_hash, routes = transform(transform_archive, File.join(target, 'site'), base)
        identity = { 'sourceRepository' => 'https://github.com/Folio-Suite/UndoKit', 'producerManifest' => manifest,
                     'releaseManifestSHA256' => Digest::SHA256.file(release_path).hexdigest,
                     'website' => { 'revision' => revision, 'importerSHA256' => Digest::SHA256.file(__FILE__).hexdigest,
                                    'docc' => tool, 'command' => ['xcrun', 'docc', 'process-archive', 'transform-for-static-hosting', '<archive>', '--output-path', '<site>', '--hosting-base-path', base.delete_suffix('/')], 'basePath' => base, 'siteTreeSHA256' => site_hash } }
        write_json(File.join(target, 'manifest.json'), identity)
        FileUtils.rm_rf(File.join(working, 'latest'))
        FileUtils.mkdir_p(File.join(working, 'latest'))
        latest_hash, = transform(transform_archive, File.join(working, 'latest/site'), '/')
        latest_identity = Marshal.load(Marshal.dump(identity))
        latest_identity['website'].merge!('basePath' => '/', 'siteTreeSHA256' => latest_hash)
        latest_identity['website']['command'][-1] = ''
        write_json(File.join(working, 'latest/manifest.json'), latest_identity)
        FileUtils.rm_rf(transform_archive)
        registry['latest'] = version
        registry['versions'] << { 'version' => version, 'basePath' => base, 'routes' => routes, 'sourceCommit' => manifest['sourceCommit'] }
        write_json(File.join(working, 'publication.json'), registry)
        empty_directories = Dir.glob(File.join(working, '**', '*'), File::FNM_DOTMATCH).select { |path| !%w[. ..].include?(File.basename(path)) && File.directory?(path) && Dir.empty?(path) }.map { |path| path.delete_prefix(working + '/') }.sort
        write_json(File.join(working, 'empty-directories.json'), empty_directories)
        check(!File.exist?(backup), "recovery backup exists: #{backup}; inspect before importing")
        File.rename(output, backup) if File.exist?(output)
        begin
          File.rename(working, output)
        rescue StandardError
          File.rename(backup, output) if File.exist?(backup)
          raise
        end
        FileUtils.rm_rf(backup)
      ensure
        FileUtils.rm_rf(working) if File.exist?(working)
      end
    end
    puts "Imported UndoKit #{version}; latest documentation: /documentation/undokit/"
  end

  def run(argv)
    options = { output: File.expand_path('../../.cache/documentation/imported', __dir__) }
    OptionParser.new do |parser|
      parser.banner = 'Usage: import.rb --artifact DIR --release-provenance FILE [--output DIR]'
      parser.on('--artifact DIR') { |value| options[:artifact] = value }
      parser.on('--release-provenance FILE') { |value| options[:release] = value }
      parser.on('--output DIR') { |value| options[:output] = value }
    end.parse!(argv)
    check(argv.empty?, 'unexpected positional arguments')
    import(options)
  rescue StandardError => error
    warn "documentation: #{error.message}"
    exit 1
  end
end
FolioDocumentation.run(ARGV) if $PROGRAM_NAME == __FILE__
