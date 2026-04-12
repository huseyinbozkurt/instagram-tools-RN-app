/**
 * Expo Config Plugin: Xcode 26 fmt consteval fix (RN 0.81+)
 *
 * fmt is bundled inside ReactNativeDependencies. Its base.h detects Xcode 26's
 * __cpp_consteval and enables consteval constructors that Xcode 26 then rejects.
 *
 * Fix: Replace the entire detection block in base.h with a hardcoded 0.
 * Also set gnu++20 and -DFMT_USE_CONSTEVAL=0 compiler flags.
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withXcode26FmtFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosDir = config.modRequest.platformProjectRoot;
      patchFmtHeaders(iosDir);
      patchPodfile(iosDir);
      return config;
    },
  ]);
}

// ── Header patching ───────────────────────────────────────────────────────────

function patchFmtHeaders(iosDir) {
  const podsDir = path.join(iosDir, 'Pods');
  if (!fs.existsSync(podsDir)) return;

  const fmtHeaders = findFiles(podsDir, (f) => f.includes('/fmt/') && f.endsWith('base.h'));

  for (const headerPath of fmtHeaders) {
    try {
      fs.chmodSync(headerPath, 0o755);
      let content = fs.readFileSync(headerPath, 'utf8');

      if (content.includes('FMT_CONSTEVAL_FIX_APPLIED')) continue;

      // Replace the entire detection block with a hardcoded 0.
      // Match from "// Detect consteval" through the "#endif" that closes it.
      const replaced = content.replace(
        /(\/\/ Detect consteval.*?#endif\s*\n#if FMT_USE_CONSTEVAL\s*\n#\s*define FMT_CONSTEVAL consteval\s*\n#\s*define FMT_CONSTEXPR20 constexpr\s*\n#else\s*\n#\s*define FMT_CONSTEVAL\s*\n#\s*define FMT_CONSTEXPR20\s*\n#endif)/s,
        `// FMT_CONSTEVAL_FIX_APPLIED — forced off for Xcode 26 compatibility
#define FMT_USE_CONSTEVAL 0
#define FMT_CONSTEVAL
#define FMT_CONSTEXPR20`
      );

      if (replaced !== content) {
        fs.writeFileSync(headerPath, replaced);
        console.log(`[fmt-fix] Patched: ${path.relative(iosDir, headerPath)}`);
      } else {
        // Fallback: try a simpler approach — just replace any line that sets it to 1
        const fallback = content
          .replace(/#\s*define FMT_USE_CONSTEVAL 1/g, '#define FMT_USE_CONSTEVAL 0 // forced off by fmt-fix')
          .replace(/#\s*define FMT_CONSTEVAL consteval/g, '#define FMT_CONSTEVAL // forced off by fmt-fix');
        if (fallback !== content) {
          // Also mark as patched
          const finalContent = '// FMT_CONSTEVAL_FIX_APPLIED\n' + fallback;
          fs.writeFileSync(headerPath, finalContent);
          console.log(`[fmt-fix] Patched (fallback): ${path.relative(iosDir, headerPath)}`);
        }
      }
    } catch (e) {
      console.warn(`[fmt-fix] Failed to patch ${headerPath}: ${e.message}`);
    }
  }
}

// ── Podfile patching ──────────────────────────────────────────────────────────

function patchPodfile(iosDir) {
  const podfilePath = path.join(iosDir, 'Podfile');
  if (!fs.existsSync(podfilePath)) return;

  let podfile = fs.readFileSync(podfilePath, 'utf8');
  if (podfile.includes('fmt-consteval-fix')) return;

  const RUBY_PATCH = `
    # ── fmt-consteval-fix: Xcode 26 compatibility ──────────────────────
    fmt_bases = Dir.glob(File.join(installer.sandbox.root.to_s, '**', 'fmt', 'base.h'))
    fmt_bases.each do |path|
      File.chmod(0755, path)
      content = File.read(path)
      next if content.include?('FMT_CONSTEVAL_FIX_APPLIED')
      # Replace all "define FMT_USE_CONSTEVAL 1" with 0
      content.gsub!(/#\\s*define FMT_USE_CONSTEVAL 1/, '#define FMT_USE_CONSTEVAL 0 // fmt-consteval-fix')
      content.gsub!(/#\\s*define FMT_CONSTEVAL consteval/, '#define FMT_CONSTEVAL // fmt-consteval-fix')
      content = "// FMT_CONSTEVAL_FIX_APPLIED\\n" + content
      File.write(path, content)
      Pod::UI.puts "  [fmt-fix] Patched #{path}"
    end
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++20'
        flags = config.build_settings['OTHER_CPLUSPLUSFLAGS'] || '$(inherited)'
        unless flags.include?('FMT_USE_CONSTEVAL')
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = flags + ' -DFMT_USE_CONSTEVAL=0'
        end
      end
    end
    # ── end fmt-consteval-fix ──────────────────────────────────────────
`;

  const existingMatch = podfile.match(/^(\s*post_install\s+do\s+\|installer\|)/m);
  if (existingMatch) {
    const insertPos = existingMatch.index + existingMatch[0].length;
    podfile = podfile.slice(0, insertPos) + '\n' + RUBY_PATCH + podfile.slice(insertPos);
  } else {
    const lastEnd = podfile.lastIndexOf('\nend');
    const hookBlock = `\n  post_install do |installer|\n${RUBY_PATCH}\n  end\n`;
    if (lastEnd !== -1) {
      podfile = podfile.slice(0, lastEnd + 4) + hookBlock + podfile.slice(lastEnd + 4);
    } else {
      podfile += hookBlock;
    }
  }

  fs.writeFileSync(podfilePath, podfile);
  console.log('[fmt-fix] Podfile post_install hook added');
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function findFiles(dir, predicate) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        results.push(...findFiles(full, predicate));
      } else if (entry.isFile() && predicate(full)) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

module.exports = withXcode26FmtFix;
