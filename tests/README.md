# Pruebas de MesaSpot

Esta carpeta, `package.json`, `package-lock.json` y `.gitignore` se mantienen únicamente en la rama `test`. El frontend usa el mismo código que `develop`; npm y jsdom sirven para las comprobaciones y no son necesarios para publicar el sitio.

## Ejecutar

Usa Node.js 22 o superior. Con el directorio de trabajo limpio:

```bash
git switch test
git pull --ff-only origin test
git fetch origin
git merge origin/develop
npm ci
npm test
```

La suite usa una API simulada y comprueba el DOM, filtros, precios, navegación, iconos, autenticación, roles, perfil, platos, galería y reseñas. No publica reseñas ni modifica Atlas. No sustituye la revisión visual responsive ni las pruebas de los servicios reales.

## Mantener la separación

- Guarda las nuevas pruebas y sus dependencias en `test` y publícalas con `git push origin test`.
- Corrige el código del producto en una rama `feature/...` creada desde `develop`; intégrala allí y vuelve a traer `develop` hacia `test`.
- Nunca mezcles toda la rama `test` hacia `develop` o `main`, ni abras un pull request con ese destino desde `test`.
- Antes de cambiar de rama, confirma tus cambios. Los archivos versionados de pruebas desaparecerán del directorio al salir de `test` y reaparecerán al regresar.
- `node_modules/` es local y no se versiona. Al cambiar de rama puede permanecer físicamente; no debe subirse. `.git/info/exclude` puede excluirlo localmente incluso cuando la rama no tenga `.gitignore`.
- Ninguna credencial privada debe guardarse en el frontend, tampoco en esta rama.
