# Checklist de Release y Actualización de APK

## Causa Raíz Resolvida
El problema reportado de no poder instalar la APK nueva sobre la anterior sin desinstalarla se debe generalmente a 2 factores principales en Android:
1. **El `versionCode` no fue incrementado:** Android rechaza la instalación de un APK cuando este tiene el mismo (o menor) `versionCode` que la aplicación actualmente instalada. Ahora el código base incrementa el `versionCode` local a 2 en su `build.gradle`.
2. **Conflicto de Firmas (Keystore Mismatch):** Cuando desarrollas y generas APKs (especialmente en entornos Debug, o si usas distintas claves Release cada vez), Android Studio genera certificados diferentes para proteger y vincular las aplicaciones al desarrollador original. Si la firma del nuevo APK no coincide con la versión antigua, Android bloquea la operación y exige desinstalar la versión anterior primero.

## Cambios Implementados
- Se ha asegurado el `applicationId` estático: `com.vonixx.producao` en el **build.gradle**.
- Se optimizó y se incluyó una configuración unificada en `android/app/build.gradle` para parsear automáticamente un archivo local llamado `keystore.properties`.
- Se incrementó la iteración inicial a `versionCode 2` y `versionName "1.1.0"`.

## Instrucciones de Release y Actualización Incremental (Update in-place)

Para que tu aplicación siempre pueda ser actualizada conservando los datos, debes crear **una única llave de firma y guardarla para toda la vida del proyecto**. A continuación te mostramos cómo hacerlo de forma segura:

### 1. Incrementar las versiones (`build.gradle`)
Siempre antes de cada Release, edita `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 3      // DEBE ser SIEMPRE un número mayor al anterior (ej. 1 -> 2 -> 3)
    versionName "1.2.0" // Versión que ve el usuario final.
}
```

### 2. Crear tú Keystore de Producción (Solo una vez)
Si no tienes uno, crea el keystore y **NUNCA lo pierdas**:
```bash
keytool -genkey -v -keystore android/app/release.keystore -alias releaseConfig -keyalg RSA -keysize 2048 -validity 10000
```

### 3. Crear archivo `keystore.properties`
Crea un archivo llamado `android/keystore.properties` e ignóralo en Git (`.gitignore`):
```properties
storeFile=release.keystore
storePassword=tu_password_secreto
keyAlias=releaseConfig
keyPassword=tu_password_secreto
```

### 4. Construir la versión para el usuario
Con este ambiente unificado y el APK firmado con exactamente la misma llave, construirás versiones actualizables:
1. Sincroniza la web app: `npm run build` y `npx cap sync android`
2. Ve al directorio android: `cd android`
3. Ensambla y firma tu build usando tu script de gradle: `./gradlew assembleRelease` o usando Android Studio seleccionando "Generate Signed Bundle / APK...".

**IMPORTANTE ACERCA LA VERSIÓN ANTIGUA**: Si la versión que ya tienes instalada en el dispositivo fue firmada con un Keystore diferente (como el Debug de otra computadora anterior), **Lamentablemente esa versión anterior tendrá que ser desinstalada por última única vez.** A partir de allí, si mantienes tu `release.keystore` único e incrementas tu `versionCode`, todos los futuros builds se instalarán exitosamente sobre esa app como actualización.
