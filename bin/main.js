#! /usr/bin/env node

const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const ora = require('ora')
const download = require('download-git-repo');
const validateProjectName = require('validate-npm-package-name');
const { program } = require('commander');
const { execSync } = require('child_process');

const packageJson = require('../package.json');
let projectName;

program
  .name('create-react-test')
  .version(packageJson.version)
  .arguments('[project-directory]')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .option('-t,--template <template>', 'choose a template <react | node>')
  .action(name => projectName = name)
  .on('--help', () => {
    console.log(`\n    Only ${chalk.green('<project-directory>')} is required \n`)
  })
  .allowUnknownOption()
  .parse(process.argv);

if (typeof projectName === 'undefined') {
  console.error(chalk.red('Please specify the project directory'));
  console.log(
    `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')} \n`
  );
  console.log('For example');
  console.log(`  ${chalk.cyan(program.name())}  ${chalk.green('<my-test>')} \n`);
  console.log(
    `Run ${chalk.cyan(`${program.name()} --help`)} to see all options`
  );

  process.exit(1);
}

createApp(projectName, program.template);

function createApp(name, template) {
  template = template === 'node'? 'node': 'react';

  const root = path.resolve(name);
  const appName = path.basename(root);

  checkAppName(appName, template);

  if (fs.existsSync(name)) {
    console.log(chalk.red(`Error: ${projectName} already exists. Please change the name`));
    process.exit(1);
  }

  run(name, template);
}

function run(name, template) {
  const spinner = ora('Installing template...').start();
  const branch = template === 'node'? '#node': '#master';

  // 拉取模板
  download(`direct:https://github.com/TangBii/template-test/${branch}`, name, {clone: true}, function (err) {
    if (err) {
      spinner.fail(err.message);
      process.exit(1);
    }

    spinner.succeed('Template generated successfully \n');
    updatePackageJson(name);
    spinner.start(`Installing dependency. This might take a couple of minutes. \n`);
    try {
      install(name);
    } catch(e) {
      spinner.fail(e.message);
      process.exit(1);
    }
    spinner.succeed('Dependency installed successfully \n');
    spinner.succeed(`${chalk.green('Success!')} Created ${name} at ${path.resolve(name)} \n`)
    console.log('you can begin by run:')
    console.log(`    ${chalk.cyan(`cd ${name} && npm start`)} \n`)
  })
}

// 检查路径是否合法
function checkAppName(appName) {
  const validationResult = validateProjectName(appName);
  if (!validationResult.validForNewPackages) {
    console.error(
      chalk.red(
        `Cannot create a project named ${chalk.green(
          `${appName}`
        )} because of npm naming restrictions:\n`
      )
    );
    [
      ...(validationResult.errors || []),
      ...(validationResult.warnings || []),
    ].forEach(err => {
      console.log(chalk.red(`  * ${err}`))
    });
    console.error(chalk.red(`\nPlease choose a different project name`));
    process.exit(1);
  }

  // TODO: there should be a single place that holds the dependencies
  const dependencies = ['react', 'react-dom', 'react-scripts'].sort();
  if (dependencies.includes(appName)) {
    console.error(
      chalk.red(
        `Cannot create a project named ${chalk.green(
          `"${appName}"`
        )} because a dependency with the same name exists. \n` + 
           `Due to the way npm works, the following names are not allowed \n\n`
      ) + 
        chalk.cyan(dependencies.map(depName => `  ${depName}`).join('\n')) + 
        chalk.red(`\n\nPlease choose a different project name.`)
    );
    process.exit(1);
  }
}

// 更新 git 信息
function updatePackageJson(name) {
  const pkgPath = path.resolve(name, 'package.json');
  const jsonData = fs.readJsonSync(pkgPath);
  jsonData.name = name;
  jsonData.version = '1.0.0';
  fs.writeJSONSync(pkgPath, jsonData, { space: '\t' })
}

// 安装依赖
function install(name) {
  const installer = hasYarn()? 'yarn': 'npm';
  execSync(`cd ${path.resolve(name)} && ${installer} install`, {stdio: 'inherit'});
}

// 判断是否有 yarn
function hasYarn() {
  try {
    execSync('yarn');
  } catch {
    return false;
  }
  return true;
}