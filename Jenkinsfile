// Multi-component pipeline (similar layout to production AIM / VIKS-style jobs).
// Paths are relative to the repo root; Jenkins workspace is ${WORKSPACE}.
//
// Optional later: replace "SonarQube …" echo stages with withSonarQubeEnv { … } and
// "Docker CI …" with real image build/push when SonarQube and Docker are available.
pipeline {
    agent any

    tools {
        nodejs 'node20' // This must match the name you gave in Global Tool Configuration
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }    

    environment {
        CI = 'true'
        WEBUI_DIR = 'aim/viks-webui'
        API_DIR = 'aim/viks-api'
        // Shared browser cache on Jenkins agents (Linux). Align with karma.conf.js default on Linux.
        // PUPPETEER_CACHE_DIR = '/mnt/azagent01/.cache/puppeteer'
        PUPPETEER_CACHE_DIR = "${env.WORKSPACE}/.cache/puppeteer"
        // PUPPETEER_CACHE_DIR = "/home/azagent01/.cache/puppeteer"
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }

        stage('Tool install') {
            steps {
                sh 'node -v && npm -v'
            }
        }

        // stage('Initialization') {
        //     steps {
        //         sh '''
        //             echo "WORKSPACE=${WORKSPACE}"
        //             echo "PUPPETEER_CACHE_DIR=${PUPPETEER_CACHE_DIR}"
        //             df -h . || true
        //         '''
        //     }
        // }

        stage('Git') {
            steps {
                sh 'git rev-parse HEAD && git status -sb || true'
            }
        }

        stage('Test viks-webui') {
            steps {
                dir(env.WEBUI_DIR) {
                    // Skip Puppeteer's postinstall download during npm ci (avoids duplicate fetch vs
                    // "browsers install" and reduces peak disk use). Browser goes to PUPPETEER_CACHE_DIR.
                    // If npm ci still fails with ENOSPC, free disk on the agent (Docker volume / prune workspaces).
                    sh '''
                        export PUPPETEER_SKIP_DOWNLOAD=true
                        npm ci --legacy-peer-deps
                    '''
                    sh 'npx puppeteer browsers install chrome'
                    sh 'npm run test:ci'
                }
            }
        }

        stage('Build viks-webui') {
            steps {
                dir(env.WEBUI_DIR) {
                    sh 'npx ng build viks-webui --configuration production'
                }
            }
        }

        stage('SonarQube viks-webui') {
            steps {
                sh 'echo "[SKIP] SonarQube viks-webui — configure SonarQube Scanner + server to enable."'
            }
        }

        stage('Docker CI viks-webui') {
            steps {
                sh 'echo "[PLACEHOLDER] Docker CI viks-webui — add image build/push when ready."'
            }
        }

        stage('Test viks-api') {
            steps {
                dir(env.API_DIR) {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
        }

        stage('Build viks-api') {
            steps {
                dir(env.API_DIR) {
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube viks-api') {
            steps {
                sh 'echo "[SKIP] SonarQube viks-api — configure SonarQube Scanner + server to enable."'
            }
        }

        stage('Docker CI viks-api') {
            steps {
                sh 'echo "[PLACEHOLDER] Docker CI viks-api — add image build/push when ready."'
            }
        }

        //Test #1: Stage to purge old browser cache (puppeteer) older than 30 days
        /*
        stage('Purge Old Puppeteer Cache') {
            steps {
                script {
                    // ROOT points to the job workspace
                    def ROOT = "${env.WORKSPACE}/.cache/puppeteer"

                    echo "Purging Puppeteer cache older than 30 days under ${ROOT} ..."

                    // Safe deletion: only delete directories older than 30 days
                    sh """
                        if [ -d "${ROOT}" ]; then
                            echo "Puppeteer cache found"
                            # -r prevents the "missing operand" error if no files/dirs match
                            find "${ROOT}" -type f -mtime +30 -print0 | xargs -0 -r rm -f || true
                            find "${ROOT}" -type d -empty -mtime +30 -print0 | xargs -0 -r rmdir || true
                        else
                            echo "Puppeteer cache NOT found"                            
                        fi
                        echo "Purge complete."
                    """
                }
            }
        }
        */

        //Test #2: Stage to purge ALL browser cache (puppeteer)
        stage('Purge All Puppeteer Cache') {
            steps {
                script {
                    def groovyRoot = "${env.WORKSPACE}/.cache/puppeteer"
        
                    // withEnv makes the variable available to the 'sh' step as a real environment variable
                    withEnv(["ROOT=${groovyRoot}"]) {
                        sh """
                            if [ -d "\${ROOT}" ]; then
                                echo "Puppeteer cache found"
                                # Now the shell knows what \${ROOT} is and can run the safety check
                                rm -rf "\${ROOT:?}"/*
                            else
                                echo "Puppeteer cache not found"
                            fi
                            echo "Purge complete."
                        """
                    }
                }
            }
        }
        
    }
}
