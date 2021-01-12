const YAML = require('yaml')
const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const Generate = require('./generate')
const logger = require('../utils/logger')

const WELCOME_API_URL = 'https://restqa.io/welcome.json'

async function initialize(program) {
  let answers = {
    name: 'app',
    url: 'https://api.restqa.io',
    env: 'local',
    description: 'Configuration generated by restqa init -y'
  }

  if (true !== program.y) {
    const questions = [{
      type: 'input',
      name: 'name',
      message: 'Project name:',
    }, {
      type: 'input',
      name: 'description',
      message: 'Description:',
    }, {
      type: 'input',
      name: 'url',
      message: 'Host name of the target api (example: http://api.example.com)',
    }, {
      type: 'input',
      name: 'env',
      default: 'local',
      message: 'Environment name of this url (local) ?',
    }, {
      type: 'list',
      name: 'ci',
      message: 'Do you need a continuous integration configuration ?',
      choices: [{
        name: 'Github Action',
        value: 'github-action' 
      }, {
        name: 'Gitlab Ci',
        value: 'gitlab-ci' 
      }, {
        name: 'Bitbucket Pipelines',
        value: 'bitbucket-pipeline' 
      
      },
      new inquirer.Separator(),
      {
        name: 'I want to configure my continuous integration by myself',
        value: false
      }]
    }]
    answers = await inquirer.prompt(questions)
  }
  initialize.generate(answers)
}

initialize.generate = async function (options) {

  options.folder = options.folder || process.cwd()

  const {
    ci,
    name,
    url,
    env,
    description,
    folder
  } = options

  if (!name) {
    throw new Error('Please share a project name.')
  }

  if (!description) {
    throw new Error('Please share a project description.')
  }

  if (!url) {
    throw new Error('Please share a project url.')
  }

  if (!env) {
    throw new Error('Please share a project url environment.')
  }

  const restqaConfig = {
    version: '0.0.1',
    metadata: {
      code: name.replace(/[^A-Z0-9]+/ig, "-").toUpperCase(),
      name,
      description,
    },
    environments: [{
      name: env,
      default: true,
      plugins: [{
        name: 'restqapi',
        config: {
          url
        }
      }],
      outputs: [{
        type: 'http-html-report',
        enabled: true,
      }, {
        type: 'file',
        enabled: true,
        config: {
          path: 'restqa-result.json'
       }
      }]
    }]
  }

  createYaml(path.resolve(folder, '.restqa.yml'), restqaConfig)

  logger.success('.restqa.yml file created successfully')

  if (ci) {
    switch (ci) {
      case 'github-action':
        var jsonContent = {
          name: 'RestQA - Integration tests',
          on: '[push]',
          jobs: {
            RestQa : {
              'runs-on': 'ubuntu-latest',
              steps: [{
                uses: 'actions/checkout@v1',
              }, {
                uses: 'restqa/restqa-action@0.0.1',
                with: {
                  path: 'tests/'
                }
              }]
            }
          }
        }

        let filepath = '.github/workflows/integration-test.yml'
        createRecursiveFolder(filepath, folder)
        createYaml(path.resolve(folder, filepath), jsonContent)

        logger.success(filepath + ' file created successfully')
        break;
      case 'gitlab-ci':
        var jsonContent = {
          stages: [
            'e2e test'
          ],
          RestQa: {
            stage: 'e2e test',
            image: {
              name: 'restqa/restqa'
            },
            script: [
              'restqa run .'
            ]
          }
        }
        createYaml(path.resolve(folder, '.gitlab-ci.yml'), jsonContent)
        logger.success('.gitlab-ci.yml file created successfully')
        break;
      case 'bitbucket-pipeline':
        var jsonContent = {
          pipelines: {
            default: [{
              step: {
                image: 'restqa/restqa',
                script: [
                  'restqa run .'
                ]
              }
            }]
          }
        }
        createYaml(path.resolve(folder, 'bitbucket-pipelines.yml'), jsonContent)
        logger.success('bitbucket-pipelines.yml file created successfully')
        break;
      default:
        throw new Error(`The continous integration "${ci}" is not supported by RestQa`)
    }
  }

  try {
    const curl = ['curl', WELCOME_API_URL]

    let response = await Generate({ args: curl, print: false })

    const output = 'tests/integration/welcome-restqa.feature'

    createRecursiveFolder(output, folder)

    const content = [
      'Feature: Welcome to the RestQA community',
      '',
      'Scenario: Get the list of useful RestQA resources',
      response
    ]

    fs.writeFileSync(path.resolve(folder, output), content.join('\n'))

    logger.success('tests/integration/welcome-restqa.feature file created successfully')
  } catch(err) {
    logger.log(`tests/integration/welcome-restqa.feature couldn\'t be created but no worries you can generate it using: restqa generate curl ${WELCOME_API_URL} -o welcome.feature`)
  }
  logger.info('You are ready to run your first test scenario using the command: restqa run')
}

function createYaml(filename, jsonContent) {
  let contentYAML = YAML.stringify(jsonContent, null, { directivesEndMarker: true })
  fs.writeFileSync(filename, contentYAML)
}

function createRecursiveFolder(filename, root) {
  path.dirname(filename).split(path.sep)
    .reduce((pathname, dir)  => {
      pathname = path.resolve(pathname, dir)
      if (!fs.existsSync(pathname)) fs.mkdirSync(pathname)
      return pathname
    }, root)
}

module.exports = initialize
