#!/bin/bash

echo "Starting NGB build"
if [[ "$GITHUB_REF_NAME" == "release/"* ]]; then
  echo "Building with docker distribution"
  BUILD_DOCKER=buildDocker
fi

./gradlew buildJar buildCli buildDoc $BUILD_DOCKER -PbuildNumber=$GITHUB_RUN_NUMBER -PnoTest
