#!/usr/bin/env ruby
# SPDX-FileCopyrightText: 2026 the Folio Project
# SPDX-License-Identifier: MIT
require_relative 'import'

options = {}
OptionParser.new do |parser|
  parser.banner = 'Usage: package.rb --artifact DIR --release-provenance FILE --output FILE'
  parser.on('--artifact DIR') { |value| options[:artifact] = File.expand_path(value) }
  parser.on('--release-provenance FILE') { |value| options[:release] = File.expand_path(value) }
  parser.on('--output FILE') { |value| options[:output] = File.expand_path(value) }
end.parse!
begin
  raise ArgumentError, 'unexpected arguments or missing options' unless ARGV.empty? && %i[artifact release output].all? { |key| options[key] }
  raise ArgumentError, 'output already exists; website assets are immutable' if File.exist?(options[:output])
  FileUtils.mkdir_p(File.dirname(options[:output]))
  Dir.mktmpdir('folio-website-asset-') do |temporary|
    root = File.join(temporary, 'bundle')
    FolioDocumentation.import(options.merge(output: root))
    release = FolioDocumentation.json(options[:release])
    FolioDocumentation.write_json(File.join(root, 'bundle.json'), {
      'schemaVersion' => 1, 'version' => release.fetch('releaseVersion'),
      'sourceCommit' => release.fetch('sourceCommit'),
      'releaseManifestSHA256' => Digest::SHA256.file(options[:release]).hexdigest
    })
    archive = File.join(temporary, 'website.tar.gz')
    stdout, stderr, status = Open3.capture3({ 'COPYFILE_DISABLE' => '1' }, 'tar', '-czf', archive, '-C', root, '.')
    raise ArgumentError, "packaging failed: #{stderr}" unless status.success?
    FileUtils.cp(archive, options[:output])
    puts "#{Digest::SHA256.file(options[:output]).hexdigest}  #{options[:output]}"
  end
rescue StandardError => error
  warn "website package: #{error.message}"
  exit 1
end
