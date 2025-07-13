//def xgs

pipeline {
    agent any
    environment {
        BUILD_VERSION = VersionNumber (versionNumberString: '${BUILD_YEAR}.${BUILD_MONTH}.${BUILDS_THIS_MONTH}')
        IMAGE_NAME = "icons-for-md"
        PROJECT_NAME = "icons-for-md"
        IMAGE_TAG_DEV = "dev-latest"
        ANSIBLE_IP = credentials('ip-ansible')
        // Repositories
        DOCKERH_REPO = "juronja"
        // NEXUS_REPO = "192.168.84.20:8082"
        ECR_REPO = "233207430299.dkr.ecr.eu-central-1.amazonaws.com"
    }
    options { buildDiscarder(logRotator(numToKeepStr: '10')) } // keeping only n builds
    stages {
        stage('Build DEV for Nexus') {
            environment {
                NEXUS_CREDS = credentials('nexus-creds')
                NEXUS_REPO = credentials('repo-nexus')
            }
            when {
                branch "dev"
            }
            steps {
                echo "Building DEV Docker image for Nexus ..."
                sh "docker build -t $NEXUS_REPO/$IMAGE_NAME:$IMAGE_TAG_DEV ."
                // Next line in single quotes for security
                sh 'echo $NEXUS_CREDS_PSW | docker login -u $NEXUS_CREDS_USR --password-stdin $NEXUS_REPO'
                sh "docker push $NEXUS_REPO/$IMAGE_NAME:$IMAGE_TAG_DEV"
            }
        }
        // stage('Build DEV for ECR') {
        //     environment {
        //         ECR_CREDS = credentials('ecr-creds')
        //     }
        //     when {
        //         branch "dev"
        //     }
        //     steps {
        //         echo "Building DEV Docker image for ECR ..."
        //         sh "docker build -t $ECR_REPO/$IMAGE_NAME:$IMAGE_TAG_DEV ."
        //         // Next line in single quotes for security
        //         sh 'echo $ECR_CREDS_PSW | docker login -u $ECR_CREDS_USR --password-stdin $ECR_REPO'
        //         sh "docker push $ECR_REPO/$IMAGE_NAME:$IMAGE_TAG_DEV"
        //     }
        // }

        // stage('Unit tests') {
        //     when {
        //         branch "main" 
        //     }
        //     steps {
        //         script {
        //             echo "Unit testing $PROJECT_NAME ..."
        //         }
        //     }
        // }

        stage('Deploy DEV on HOMELAB (Host)') {
            when {
                branch "dev" 
            }
            steps {
                sh "docker image prune --all --force"
                // sh "printenv"
                sh "curl -o compose.base.yaml https://raw.githubusercontent.com/juronja/icons-for-md/refs/heads/dev/compose.base.yaml > compose.base.yaml"
                sh "curl -o compose.yaml https://raw.githubusercontent.com/juronja/icons-for-md/refs/heads/dev/compose.dev.yaml > compose.yaml"
                echo "Starting container $PROJECT_NAME ..."
                sh "docker compose up -d --remove-orphans"
            }
        }
        // stage('Deploy DEV on DOKS') {
        //     environment {
        //         K8S_NAMESPACE = "utm-builder"
        //         APP_IMAGE = "$ECR_REPO/$IMAGE_NAME:$IMAGE_TAG_DEV"
        //         HELM_FOLDER = "helm-chart"
        //     }
        //     when {
        //         branch "dev" 
        //     }
        //     input {
        //         message 'Deploy on DOKS?'
        //     }
        //     steps {
        //         script {
        //             echo "Deploying helm on DOKS ..."
        //             sh "envsubst < $HELM_FOLDER/values.yaml | helm upgrade $PROJECT_NAME $HELM_FOLDER -n $K8S_NAMESPACE --install -f -"
        //         }
        //     }
        // }
        stage('Build MAIN for Dockerhub') {
            environment {
                DOCKERHUB_CREDS = credentials('dockerhub-creds')
            }
            when {
                branch "main" 
            }
            steps {
                echo "Building Docker image for Docker Hub ..."
                sh "docker build -t $DOCKERH_REPO/$IMAGE_NAME:latest -t $DOCKERH_REPO/$IMAGE_NAME:$BUILD_VERSION ."
                // Next line in single quotes for security
                sh 'echo $DOCKERHUB_CREDS_PSW | docker login -u $DOCKERHUB_CREDS_USR --password-stdin'
                sh "docker push $DOCKERH_REPO/$IMAGE_NAME:latest"
                sh "docker push $DOCKERH_REPO/$IMAGE_NAME:$BUILD_VERSION"
            }
        }
        stage('Deploy MAIN on HOSTING-PROD') {
            environment {
                HOSTING_CREDS = credentials('creds-hosting-prod')
            }
            when {
                branch "main" 
            }
            steps {
                script { // sshagent must be in script block
                    sshagent(['ssh-hosting-prod']) {
                        echo "Deploying Docker container on HOSTING-PROD ..."
                        sh "ssh -o StrictHostKeyChecking=no $HOSTING_CREDS_USR@$HOSTING_CREDS_PSW 'bash -c \"\$(wget -qLO - https://raw.githubusercontent.com/juronja/icons-for-md/refs/heads/main/compose-commands.sh)\"'"
                    }
                }
            }
        }
        // stage('Provision EC2') {
        //     environment {
        //         HOSTING_CREDS = credentials('creds-hosting-prod')
        //     }
        //     when {
        //         branch "main" 
        //     }
        //     steps {
        //         dir("terraform/ec2") {
        //             sh "terraform init"
        //             sh "terraform apply --auto-approve"
        //         }
        //     }
        // }
        stage('Deploy MAIN on EC2') {
            environment {
                EC2_CREDS = credentials('ssh-aws-ec2-id-amazon')
            }
            when {
                branch "main" 
            }
            steps {
                script {
                    echo "Copy files to ansible control node ..."
                    sshagent(['ssh-ansible']) {
                        sh "scp -r -o StrictHostKeyChecking=no ansible/ juronja@$ANSIBLE_IP:~/apps/ansible/icons-for-md/"
                        withCredentials([sshUserPrivateKey(credentialsId: 'ssh-aws-ec2-id-amazon', keyFileVariable: 'keyfile', usernameVariable: 'user')]) {
                            sh "scp ${keyfile} juronja@$ANSIBLE_IP:~/.ssh/id_amazon.pem"
                        }
                    }
                }
            }
        }
    }
}