#!/usr/bin/env node

const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const program = require('commander');

const VERSION = '1.3.1';
const ARTIFACT_ID = 'cg-api';
const ARTIFACT_GROUPS = ['com.jfeat', 'jfeat'];
const ARTIFACT_NAME = 'cg-api-1.3.1-standalone.jar';
const TESTCASE_NAME = 'cg-api-test.http';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hasCmd(cmd) {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
  return res.status === 0;
}

function runMavenCopy(outputDir, group, debug) {
  const args = [
    'org.apache.maven.plugins:maven-dependency-plugin:3.2.0:copy',
    `-Dartifact=${group}:${ARTIFACT_ID}:${VERSION}`,
    '-Dtype=jar',
    '-Dclassifier=standalone',
    `-DoutputDirectory=${outputDir}`,
    '-U',
  ];
  if (debug) args.unshift('-X');
  const mvnCmd = hasCmd('mvn') ? 'mvn' : (hasCmd('mvn.cmd') ? 'mvn.cmd' : null);
  if (!mvnCmd) {
    console.error('Maven 未检测到，请安装 Maven 并确保其在 PATH 中。');
    process.exit(1);
  }
  console.log(mvnCmd, ...args);
  const res = spawnSync(mvnCmd, args, { stdio: 'inherit' });
  return res.status === 0;
}

function runMavenGet(group, debug) {
  const args = [
    'org.apache.maven.plugins:maven-dependency-plugin:3.2.0:get',
    `-Dartifact=${group}:${ARTIFACT_ID}:${VERSION}`,
    '-Dtype=jar',
    '-Dclassifier=standalone',
    '-U',
  ];
  if (debug) args.unshift('-X');
  const mvnCmd = hasCmd('mvn') ? 'mvn' : (hasCmd('mvn.cmd') ? 'mvn.cmd' : null);
  if (!mvnCmd) {
    console.error('Maven 未检测到，请安装 Maven 并确保其在 PATH 中。');
    process.exit(1);
  }
  console.log(mvnCmd, ...args);
  const res = spawnSync(mvnCmd, args, { stdio: 'inherit' });
  return res.status === 0;
}

function findLocalJarCandidates(tmpDir) {
  const candidates = [];
  // 1) 临时目录
  candidates.push(path.join(tmpDir, ARTIFACT_NAME));
  // 2) 工作区目录（如果有人手动放置）
  candidates.push(path.join(process.cwd(), ARTIFACT_NAME));
  // 3) 本地 Maven 仓库
  const m2Jar = path.join(os.homedir(), '.m2', 'repository', 'com', 'jfeat', 'cg-api', '1.3.1', ARTIFACT_NAME);
  candidates.push(m2Jar);
  return candidates.filter(p => {
    try { return fs.existsSync(p); } catch (_) { return false; }
  });
}

function extractTestHttp(tmpDir, jarPath) {
  const jarCmd = hasCmd('jar') ? 'jar' : (hasCmd('jar.exe') ? 'jar.exe' : null);
  if (!jarCmd) {
    console.warn('未检测到 jar 命令，跳过提取测试用例。');
    return;
  }
  try {
    console.log(jarCmd, 'xf', jarPath, `BOOT-INF/classes/${TESTCASE_NAME}`);
    const res = spawnSync(jarCmd, ['xf', jarPath, `BOOT-INF/classes/${TESTCASE_NAME}`], { cwd: tmpDir, stdio: 'inherit' });
    if (res.status === 0) {
      const src = path.join(tmpDir, 'BOOT-INF', 'classes', TESTCASE_NAME);
      const dest = path.join(tmpDir, TESTCASE_NAME);
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
      }
      // 清理目录
      try { fs.rmdirSync(path.join(tmpDir, 'BOOT-INF', 'classes'), { recursive: true }); } catch (_) {}
      try { fs.rmdirSync(path.join(tmpDir, 'BOOT-INF'), { recursive: true }); } catch (_) {}
    }
  } catch (e) {
    console.warn('提取测试用例失败：', e.message);
  }
}

function openVSCode(testcasePath) {
  const codeCmd = hasCmd('code') ? 'code' : (hasCmd('code.cmd') ? 'code.cmd' : null);
  if (!codeCmd) return;
  console.log(codeCmd, testcasePath);
  const child = spawn(codeCmd, [testcasePath], { stdio: 'ignore', detached: true });
  child.on('error', (e) => {
    console.warn('打开 VS Code 失败：', e.message);
  });
  try { child.unref(); } catch (_) {}
}

program
  .option('-p, --port <port>', 'running port other than 8080')
  .option('-f, --force', 'force to update the standalone jar and cg-api-test.http')
  .option('-t, --test', 'open cg-api-test.http only')
  .option('--jar <path>', 'use local standalone jar instead of maven')
  .option('--mvn-debug', '启用 Maven 调试输出 (-X)')
  .parse(process.argv);

const opts = program.opts();
const port = opts.port ? String(opts.port) : '8080';

// 使用平台系统默认临时目录
const tmpBase = path.join(os.tmpdir(), 'cg-api');
ensureDir(tmpBase);

let jarPath = path.join(tmpBase, ARTIFACT_NAME);
const testcasePath = path.join(tmpBase, TESTCASE_NAME);

// 确定 JAR 路径
if (opts.jar) {
  const provided = path.resolve(opts.jar);
  if (!fs.existsSync(provided)) {
    console.error(`指定的 JAR 不存在：${provided}`);
    process.exit(1);
  }
  jarPath = provided;
} else {
  // 仅检查系统临时目录下是否存在；不存在则拉取并复制至临时目录
  if (opts.force || !fs.existsSync(jarPath)) {
    console.log('未在临时目录检测到 JAR，使用 Maven 拉取并复制。');
    let ok = false;
    for (const group of ARTIFACT_GROUPS) {
      const got = runMavenGet(group, opts.mvnDebug);
      const copied = runMavenCopy(tmpBase, group, opts.mvnDebug);
      if (copied && fs.existsSync(jarPath)) { ok = true; break; }
    }
    if (!ok) {
      console.error('通过 Maven 拉取 standalone JAR 失败。');
      console.error('提示：仓库路径可能不一致（如 jfeat/cg-api 与 com/jfeat/cg-api）。');
      console.error('请确认制品的 groupId 是否为 com.jfeat 或 jfeat，并确保版本与 classifier 存在。');
      process.exit(1);
    }
  } else {
    console.log(`检测到临时目录 JAR：${jarPath}`);
  }
  if (!fs.existsSync(jarPath)) {
    console.error(`未找到 JAR：${jarPath}`);
    console.error('提示：可使用 --jar <path> 指定本地 JAR，或在 Maven settings.xml 中配置私有仓库。');
    process.exit(1);
  }
}

// 处理测试用例
if (opts.force || !fs.existsSync(testcasePath)) {
  extractTestHttp(tmpBase, jarPath);
}
if (opts.test) {
  if (fs.existsSync(testcasePath)) {
    openVSCode(testcasePath);
  } else {
    console.warn('未能提取到测试用例 cg-api-test.http。');
  }
  process.exit(0);
}

// 运行服务
if (fs.existsSync(testcasePath)) {
  openVSCode(testcasePath);
}

const javaCmd = hasCmd('java') ? 'java' : (hasCmd('java.exe') ? 'java.exe' : null);
if (!javaCmd) {
  console.error('Java 未检测到，请安装并确保其在 PATH 中。');
  process.exit(1);
}

const serverArgs = ['-jar', jarPath, `--server.port=${port}`];
console.log(javaCmd, ...serverArgs);
const child = spawn(javaCmd, serverArgs, { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));