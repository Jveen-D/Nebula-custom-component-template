'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const TARGETS = [
  { label: 'GitHub', option: 'github', remote: 'origin', url: 'https://github.com/Jveen-D/Nebula-custom-component-template.git' },
  { label: 'Gitee', option: 'gitee', remote: 'gitee', url: 'https://gitee.com/obar/Nebula-custom-component-template.git' },
];
const HELP = `Usage: npm run sync -- [--branch main] [--tag v1.2.3] [--check]
  --github NAME   GitHub remote name (default: origin)
  --gitee NAME    Gitee remote name (default: gitee)
  --branch NAME   One local branch (default: main)
  --tag VERSION   Explicit version tag; repeat to select more tags
  --check         Preflight only; do not push
  --help          Show this help
Only committed history is pushed. No merge, force, deletion or automatic commit.`;

function parseArgs(args) {
  const options = { branch: 'main', tags: [], check: false, remotes: {} };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') return { help: true };
    if (arg === '--check') { options.check = true; continue; }
    if (!['--branch', '--tag', '--github', '--gitee'].includes(arg)) throw new Error(`Unknown option: ${arg}`);
    const value = args[++i];
    if (!value || value.startsWith('-')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--branch') options.branch = value;
    else if (arg === '--tag') {
      if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value)) {
        throw new Error('Tags must be explicit version names, for example v1.2.3 or v1.2.3-rc.1.');
      }
      options.tags.push(value);
    } else options.remotes[arg.slice(2)] = value;
  }
  options.tags = [...new Set(options.tags)];
  return options;
}

function run({ cwd = path.resolve(__dirname, '..'), args = process.argv.slice(2), targets = TARGETS, log = console.log, error = console.error } = {}) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };
  // Never accept a new host key or start an interactive SSH authentication flow.
  const systemRoot = process.env.SystemRoot || process.env.WINDIR;
  const windowsSsh = systemRoot && path.join(systemRoot, 'System32', 'OpenSSH', 'ssh.exe');
  const ssh = process.platform === 'win32' && windowsSsh && fs.existsSync(windowsSsh) ? `"${windowsSsh.replace(/\\/g, '/')}"` : 'ssh';
  env.GIT_SSH_COMMAND = `${ssh} -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15`;
  const git = (gitArgs, { allowFailure = false, network = false } = {}) => {
    const result = spawnSync('git', gitArgs, {
      cwd, env, encoding: 'utf8', windowsHide: true,
      timeout: network ? 120000 : 30000, maxBuffer: 32 * 1024 * 1024,
    });
    if (result.error || result.status !== 0) {
      if (allowFailure && !result.error && result.status === 1) return null;
      // Commands never contain token/password values. Do not print repository file contents.
      throw new Error(result.error?.message || result.stderr.trim() || result.stdout.trim() || `git exited ${result.status}`);
    }
    return result.stdout.trim();
  };
  const ancestor = (older, newer) => git(['merge-base', '--is-ancestor', older, newer], { allowFailure: true }) !== null;
  const remoteRefs = (url) => {
    const lines = git(['ls-remote', '--symref', url, 'HEAD', 'refs/heads/*', 'refs/tags/*'], { network: true }).split(/\r?\n/);
    const refs = new Map();
    let defaultBranch = null;
    for (const line of lines) {
      const symbolic = /^ref: refs\/heads\/(.+)\tHEAD$/.exec(line);
      const ref = /^([a-f0-9]+)\t(.+)$/.exec(line);
      if (symbolic) defaultBranch = symbolic[1];
      else if (ref) refs.set(ref[2], ref[1]);
    }
    return { refs, defaultBranch };
  };
  const verifyRefs = (state, wanted) => wanted.every(({ ref, oid }) => state.refs.get(ref) === oid);

  let options;
  try {
    options = parseArgs(args);
    if (options.help) { log(HELP); return 0; }
    git(['rev-parse', '--show-toplevel']);
    git(['check-ref-format', '--branch', options.branch]);
    if (git(['rev-parse', '--is-shallow-repository']) === 'true') throw new Error('Shallow repository: obtain complete history before syncing.');
    const branchRef = `refs/heads/${options.branch}`;
    const tip = git(['rev-parse', '--verify', '--quiet', `${branchRef}^{commit}`], { allowFailure: true });
    if (!tip) throw new Error(`Local branch ${options.branch} has no commit or does not exist. Review the intended files and identity before making an initial commit.`);
    if (git(['status', '--porcelain', '--untracked-files=normal'])) {
      throw new Error('Working tree is not clean. Review and commit intended changes explicitly; this command never stages or commits files.');
    }
    const wanted = [{ ref: branchRef, oid: tip }];
    for (const tag of options.tags) {
      const ref = `refs/tags/${tag}`;
      git(['check-ref-format', ref]);
      const oid = git(['rev-parse', '--verify', ref]);
      const commit = git(['rev-parse', '--verify', `${ref}^{commit}`]);
      if (!ancestor(commit, tip)) throw new Error(`Tag ${tag} does not belong to the selected branch history.`);
      wanted.push({ ref, oid });
    }
    // Inspect every path in history, including files later deleted in another commit.
    // This is a conservative path guard, not a complete secret scanner.
    const historicalPaths = git(['log', '--format=', '--name-only', '-z', '--no-renames', '--diff-merges=first-parent', '--root', tip]);
    const unsafePaths = [...new Set(historicalPaths.split('\0').map(file => file.replace(/^[\r\n]+/, '')).filter(file =>
      /(^|\/)(\.netrc|\.pypirc|id_rsa|id_ed25519|credentials(?:\.json)?|[^/]+\.(?:pem|key|p12|pfx))$/i.test(file) ||
      /\/\.npmrc$/i.test(file) ||
      /(^|\/)\.env(?:\.|$)/i.test(file) && !/\.env\.(?:example|sample|template)$/i.test(file) ||
      /(^|\/)(?:\.ssh|\.aws)(?:\/|$)/i.test(file)
    ))];
    if (unsafePaths.length) throw new Error(`Potential private configuration in committed history; review before publishing:\n${unsafePaths.join('\n')}`);
    // A root .npmrc may ship the approved public registry configuration, never auth.
    // Inspect every historical blob, including versions removed in later commits.
    const npmrcChanges = git(['log', '--format=', '--raw', '--no-abbrev', '--no-renames', '--diff-merges=first-parent', '--root', tip, '--', '.npmrc']);
    const npmrcBlobs = new Set();
    for (const line of npmrcChanges.split(/\r?\n/)) {
      const change = /^:[0-7]{6} [0-7]{6} ([a-f0-9]+) ([a-f0-9]+) [A-Z]\t\.npmrc$/.exec(line);
      if (change) for (const oid of change.slice(1)) if (!/^0+$/.test(oid)) npmrcBlobs.add(oid);
    }
    for (const oid of npmrcBlobs) {
      const content = git(['cat-file', 'blob', oid]);
      const safe = content.split(/\r?\n/).every(line => {
        if (!line.trim()) return true;
        const setting = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/.exec(line);
        if (!setting) return false;
        const [, key, value] = setting;
        if (key === 'strict-ssl') return value === 'true';
        return (key === 'registry' || /^@[A-Za-z0-9_.-]+:registry$/.test(key)) && ['https://registry.npmjs.org/', 'https://nexus.bjblackhole.cn/repository/npm-group/'].includes(value);
      });
      if (!safe) throw new Error('Potential private configuration in committed history: .npmrc may only contain the approved HTTPS registry/scope settings and strict-ssl=true. No authentication fields or other content are allowed.');
    }

    log(`Selected branch: ${options.branch} @ ${tip}`);
    log(`Selected tags: ${options.tags.join(', ') || '(none)'}`);
    const plans = [];
    let blocked = false;
    for (const target of targets) {
      const remote = options.remotes[target.option] || target.remote;
      try {
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(remote)) throw new Error('Invalid remote name.');
        const fetchUrls = git(['remote', 'get-url', '--all', remote]).split(/\r?\n/);
        const pushUrls = git(['remote', 'get-url', '--push', '--all', remote]).split(/\r?\n/);
        if (fetchUrls.length !== 1 || pushUrls.length !== 1 || fetchUrls[0] !== target.url || pushUrls[0] !== target.url) {
          throw new Error('Remote must have exactly the approved fetch and push URL; inspect its configuration and URL rewrites.');
        }
        const state = remoteRefs(target.url);
        const heads = [...state.refs.keys()].filter(ref => ref.startsWith('refs/heads/'));
        log(`[${target.label}] Default branch: ${state.defaultBranch || (state.refs.size === 0 ? '(empty; not advertised)' : '(not advertised)')}`);
        if (!state.defaultBranch && state.refs.size > 0) throw new Error('Cannot determine the nonempty remote default branch. Inspect it manually.');
        const previous = state.refs.get(branchRef);
        if (!previous && heads.length) throw new Error(`Selected branch ${options.branch} is absent on this nonempty remote. Inspect branch names/history before creating it.`);
        if (previous && previous !== tip) {
          git(['fetch', '--no-tags', '--no-write-fetch-head', '--no-recurse-submodules', target.url, branchRef], { network: true });
          if (!ancestor(previous, tip)) throw new Error('Remote branch is ahead, divergent or unrelated. Preserve both histories and reconcile manually.');
        }
        for (const { ref, oid } of wanted.slice(1)) {
          if (state.refs.has(ref) && state.refs.get(ref) !== oid) throw new Error(`Tag conflict: ${ref}. Existing tags will never be overwritten.`);
        }
        plans.push({ target, remote, state });
        log(`[${target.label}] PREFLIGHT OK`);
      } catch (failure) {
        blocked = true;
        error(`[${target.label}] PREFLIGHT FAILED: ${failure.message}`);
      }
    }
    if (blocked) { error('No pushes started. Fix the reported issues and rerun the same command.'); return 1; }
    if (options.check) { log('Preflight completed; no pushes requested.'); return 0; }

    let failed = false;
    for (const { target, remote, state } of plans) {
      try {
        if (!verifyRefs(state, wanted)) {
          // Explicit refspecs pin the reviewed commit even if a local branch moves.
          // Disable implicit tag/submodule publishing and remote mirror configuration.
          git(['-c', `remote.${remote}.mirror=false`, '-c', 'push.followTags=false',
            'push', '--porcelain', '--no-follow-tags', '--recurse-submodules=no', remote,
            ...wanted.map(({ ref, oid }) => `${oid}:${ref}`)], { network: true });
        }
        const verified = remoteRefs(target.url);
        if (!verifyRefs(verified, wanted)) throw new Error('Remote SHA verification failed; inspect remote changes and retry.');
        log(`[${target.label}] SUCCESS ${wanted.map(({ ref, oid }) => `${ref}=${oid}`).join(' ')}`);
      } catch (failure) {
        failed = true;
        error(`[${target.label}] FAILED: ${failure.message}`);
      }
    }
    if (failed) { error('Sync incomplete. A remote may already have succeeded. Rerun the same command safely after fixing the failure.'); return 1; }
    log('Both remotes verified. This is sequential publishing, not a cross-platform atomic transaction.');
    return 0;
  } catch (failure) {
    error(`Sync stopped: ${failure.message}`);
    return 1;
  }
}

if (require.main === module) process.exitCode = run();
module.exports = { run };
