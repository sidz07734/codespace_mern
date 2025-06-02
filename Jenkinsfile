// Jenkinsfile for CodeSpace MERN Application

pipeline {
    agent any
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }
    
    environment {
        NODE_VERSION = '18'
        DOCKER_IMAGE_BACKEND = 'codespace-backend'
        DOCKER_IMAGE_FRONTEND = 'codespace-frontend'
        DOCKER_REGISTRY = credentials('docker-registry-url')
        DOCKER_CREDENTIALS = credentials('docker-hub-credentials')
        SONAR_TOKEN = credentials('sonar-token')
        SONAR_HOST_URL = credentials('sonar-host-url')
        SLACK_WEBHOOK = credentials('slack-webhook')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                    env.GIT_BRANCH = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD').trim()
                    env.BUILD_TIMESTAMP = sh(returnStdout: true, script: 'date +%Y%m%d_%H%M%S').trim()
                }
                echo "Building branch: ${env.GIT_BRANCH}, commit: ${env.GIT_COMMIT}"
            }
        }
        
        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                                sh '''
                                    echo "Installing backend dependencies..."
                                    npm ci
                                    npm list --depth=0
                                '''
                            }
                        }
                    }
                }
                
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                                sh '''
                                    echo "Installing frontend dependencies..."
                                    npm ci
                                    npm list --depth=0
                                '''
                            }
                        }
                    }
                }
            }
        }
        
        stage('Code Quality') {
            parallel {
                stage('Lint Backend') {
                    steps {
                        dir('backend') {
                            nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                                sh 'npm run lint || true'
                            }
                        }
                    }
                }
                
                stage('Lint Frontend') {
                    steps {
                        dir('frontend') {
                            nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                                sh 'npm run lint || true'
                            }
                        }
                    }
                }
                
                stage('Security Audit') {
                    steps {
                        nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                            sh '''
                                echo "Running security audit..."
                                cd backend && npm audit --production || true
                                cd ../frontend && npm audit --production || true
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Test') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        script {
                            docker.image('mongo:7.0').withRun('-p 27017:27017') { c ->
                                dir('backend') {
                                    nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                                        sh '''
                                            export MONGODB_URI=mongodb://localhost:27017/codespace_test
                                            export JWT_SECRET=test_secret_key
                                            export NODE_ENV=test
                                            npm test -- --coverage --ci
                                        '''
                                    }
                                }
                            }
                        }
                    }
                    post {
                        always {
                            junit 'backend/coverage/junit.xml'
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'backend/coverage/lcov-report',
                                reportFiles: 'index.html',
                                reportName: 'Backend Coverage Report'
                            ])
                        }
                    }
                }
                
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                                sh 'CI=true npm test -- --coverage --watchAll=false'
                            }
                        }
                    }
                    post {
                        always {
                            junit 'frontend/coverage/junit.xml'
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'frontend/coverage/lcov-report',
                                reportFiles: 'index.html',
                                reportName: 'Frontend Coverage Report'
                            ])
                        }
                    }
                }
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                nodejs(nodeJSInstallationName: "NodeJS-${NODE_VERSION}") {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            npx sonar-scanner \
                                -Dsonar.projectKey=codespace-mern \
                                -Dsonar.projectName="CodeSpace MERN" \
                                -Dsonar.sources=backend/,frontend/src/ \
                                -Dsonar.exclusions=**/node_modules/**,**/coverage/**,**/*.test.js \
                                -Dsonar.javascript.lcov.reportPaths=backend/coverage/lcov.info,frontend/coverage/lcov.info \
                                -Dsonar.host.url=$SONAR_HOST_URL \
                                -Dsonar.login=$SONAR_TOKEN
                        '''
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        
        stage('Build Docker Images') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    tag pattern: "v\\d+\\.\\d+\\.\\d+", comparator: "REGEXP"
                }
            }
            parallel {
                stage('Build Backend') {
                    steps {
                        script {
                            def backendImage = docker.build(
                                "${DOCKER_IMAGE_BACKEND}:${env.GIT_COMMIT}",
                                "-f Dockerfile.backend ."
                            )
                            
                            docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-hub-credentials') {
                                backendImage.push()
                                backendImage.push('latest')
                                if (env.GIT_BRANCH == 'main') {
                                    backendImage.push('stable')
                                }
                            }
                        }
                    }
                }
                
                stage('Build Frontend') {
                    steps {
                        script {
                            def frontendImage = docker.build(
                                "${DOCKER_IMAGE_FRONTEND}:${env.GIT_COMMIT}",
                                "-f Dockerfile.frontend ."
                            )
                            
                            docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-hub-credentials') {
                                frontendImage.push()
                                frontendImage.push('latest')
                                if (env.GIT_BRANCH == 'main') {
                                    frontendImage.push('stable')
                                }
                            }
                        }
                    }
                }
            }
        }
        
        stage('Security Scan') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            parallel {
                stage('Scan Backend Image') {
                    steps {
                        sh """
                            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL \
                                --format template --template "@contrib/junit.tpl" \
                                -o backend-trivy-report.xml \
                                ${DOCKER_IMAGE_BACKEND}:${env.GIT_COMMIT}
                        """
                        junit 'backend-trivy-report.xml'
                    }
                }
                
                stage('Scan Frontend Image') {
                    steps {
                        sh """
                            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL \
                                --format template --template "@contrib/junit.tpl" \
                                -o frontend-trivy-report.xml \
                                ${DOCKER_IMAGE_FRONTEND}:${env.GIT_COMMIT}
                        """
                        junit 'frontend-trivy-report.xml'
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    sshagent(['staging-server-ssh']) {
                        sh '''
                            ssh -o StrictHostKeyChecking=no deploy@staging.codespace.com << EOF
                                cd /opt/codespace
                                export IMAGE_TAG=${GIT_COMMIT}
                                docker-compose pull
                                docker-compose up -d
                                docker system prune -f
                                echo "Staging deployment completed at $(date)"
EOF
                        '''
                    }
                }
            }
            post {
                success {
                    echo "Staging deployment successful!"
                    // Run smoke tests
                    sh 'curl -f http://staging.codespace.com/api/health || exit 1'
                }
            }
        }
        
        stage('Performance Test') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    sh '''
                        docker run --rm -v ${WORKSPACE}/tests/performance:/scripts \
                            loadimpact/k6 run /scripts/load-test.js \
                            --out json=/scripts/performance-results.json
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'tests/performance/performance-results.json', fingerprint: true
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            input {
                message "Deploy to production?"
                ok "Deploy"
                parameters {
                    choice(
                        name: 'DEPLOYMENT_TYPE',
                        choices: ['Blue-Green', 'Rolling', 'Canary'],
                        description: 'Select deployment strategy'
                    )
                }
            }
            steps {
                script {
                    echo "Deploying to production using ${DEPLOYMENT_TYPE} strategy..."
                    
                    // Backup database before deployment
                    sshagent(['production-server-ssh']) {
                        sh '''
                            ssh -o StrictHostKeyChecking=no deploy@prod.codespace.com << EOF
                                cd /opt/codespace
                                docker-compose exec -T mongodb mongodump --out=/backup/${BUILD_TIMESTAMP}
                                echo "Database backup completed"
EOF
                        '''
                    }
                    
                    // Deploy based on strategy
                    if (params.DEPLOYMENT_TYPE == 'Blue-Green') {
                        sshagent(['production-server-ssh']) {
                            sh '''
                                ssh -o StrictHostKeyChecking=no deploy@prod.codespace.com << EOF
                                    cd /opt/codespace
                                    export IMAGE_TAG=${GIT_COMMIT}
                                    
                                    # Deploy to blue environment
                                    docker-compose -f docker-compose.blue.yml up -d
                                    sleep 30
                                    
                                    # Health check
                                    curl -f http://localhost:8080/api/health || exit 1
                                    
                                    # Switch traffic
                                    docker-compose -f docker-compose.yml up -d nginx
                                    
                                    # Stop green environment
                                    docker-compose -f docker-compose.green.yml down
                                    
                                    echo "Blue-Green deployment completed"
EOF
                            '''
                        }
                    } else {
                        sshagent(['production-server-ssh']) {
                            sh '''
                                ssh -o StrictHostKeyChecking=no deploy@prod.codespace.com << EOF
                                    cd /opt/codespace
                                    export IMAGE_TAG=${GIT_COMMIT}
                                    docker-compose pull
                                    docker-compose up -d
                                    docker system prune -f
                                    echo "Production deployment completed at $(date)"
EOF
                            '''
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
            node('master') {
                sh 'docker system prune -f || true'
            }
        }
        
        success {
            script {
                def message = """
                    ✅ Build Successful!
                    Branch: ${env.GIT_BRANCH}
                    Commit: ${env.GIT_COMMIT}
                    Build: ${env.BUILD_NUMBER}
                    Duration: ${currentBuild.durationString}
                """
                
                slackSend(
                    color: 'good',
                    message: message,
                    webhook: env.SLACK_WEBHOOK
                )
                
                if (env.GIT_BRANCH == 'main') {
                    // Create Git tag for successful production builds
                    sshagent(['github-ssh']) {
                        sh """
                            git tag -a v${env.BUILD_NUMBER} -m "Release v${env.BUILD_NUMBER}"
                            git push origin v${env.BUILD_NUMBER}
                        """
                    }
                }
            }
        }
        
        failure {
            script {
                def message = """
                    ❌ Build Failed!
                    Branch: ${env.GIT_BRANCH}
                    Commit: ${env.GIT_COMMIT}
                    Build: ${env.BUILD_NUMBER}
                    Failed Stage: ${env.STAGE_NAME}
                    Error: Check console output
                """
                
                slackSend(
                    color: 'danger',
                    message: message,
                    webhook: env.SLACK_WEBHOOK
                )
                
                emailext(
                    subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                    body: message,
                    to: '${DEFAULT_RECIPIENTS}'
                )
            }
        }
        
        unstable {
            slackSend(
                color: 'warning',
                message: "Build Unstable: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                webhook: env.SLACK_WEBHOOK
            )
        }
    }
}