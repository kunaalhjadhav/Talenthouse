gradle-wrapper.jar (a small binary bootstrap jar) is intentionally not included —
binary files can't be reliably hand-authored. Generate it in one command once you
have Gradle installed locally (or just open this project in Android Studio, which
regenerates it automatically on first sync):

  cd android
  gradle wrapper --gradle-version 8.7

This creates gradle/wrapper/gradle-wrapper.jar matching the distributionUrl
already set in gradle-wrapper.properties.
