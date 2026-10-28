# Remi Recetas · Servicio de recetas

[![CI](https://github.com/florenciaPenaSepulveda/remi-ms-recetas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/florenciaPenaSepulveda/remi-ms-recetas/actions/workflows/ci.yml)

Microservicio de **Remi Recetas** que guarda las recetas y el catálogo de ingredientes. No expone HTTP: escucha mensajes en una cola de RabbitMQ y responde al [gateway](https://github.com/florenciaPenaSepulveda/remi-gateway). Hecho con NestJS 11 y MongoDB.

## Repositorios del sistema

| Repositorio | Función |
|---|---|
| [remi-gateway](https://github.com/florenciaPenaSepulveda/remi-gateway) | API HTTP pública, autenticación y enrutamiento |
| [remi-ms-users](https://github.com/florenciaPenaSepulveda/remi-ms-users) | Usuarios, inicio de sesión y tokens |
| **remi-ms-recetas** (este) | Recetas e ingredientes |
| [remi-ms-tags](https://github.com/florenciaPenaSepulveda/remi-ms-tags) | Etiquetas de las recetas |
| [remi-ms-socials](https://github.com/florenciaPenaSepulveda/remi-ms-socials) | Me gusta y comentarios |
| [remi-frontend](https://github.com/florenciaPenaSepulveda/remi-frontend) | Aplicación web en React |

## Cómo funciona una receta

Quien crea una receta indica los ingredientes por nombre (o por ID) y la cantidad. El servicio los busca en el catálogo, guarda la referencia y **calcula las calorías** como la suma de `cantidad × calorías por unidad` de cada ingrediente; el cliente no puede fijarlas. Las instrucciones llegan como texto, una línea por paso, y se guardan como lista de pasos.

Solo la persona que creó una receta puede modificarla o eliminarla: el servicio compara el autor guardado con el usuario que el gateway autenticó y responde 403 si no coincide.

## Mensajes que atiende

| Patrón | Datos | Respuesta |
|---|---|---|
| `create_recipe` | datos de la receta y `userId` | Receta con ingredientes completos |
| `find_all_recipes` | — | Recetas, las más recientes primero |
| `find_recipe` | `id` | Receta o 404 |
| `update_recipe` | `id`, `userId`, `dto` | Receta actualizada (calorías recalculadas) |
| `remove_recipe` | `id`, `userId` | `{ id, deleted }` |
| `find_recipes_by_user` | `userId` | Recetas de esa persona |
| `find_recipes_by_ids` | `ids` (hasta 100) | Recetas con esos IDs |
| `search_recipes_by_ingredients` | `ingredients` (coma), `mode` (`all` o `any`) | Recetas |
| `search_recipes_by_max_calories` | `max` | Recetas |
| `search_recipes_by_calories_range` | `min`, `max` | Recetas |
| `search_recipes_by_categories` | `categories` (coma, sin distinguir mayúsculas) | Recetas |
| `create_ingredient`, `find_all_ingredients`, `find_ingredient`, `update_ingredient`, `remove_ingredient` | | CRUD del catálogo |
| `populate_ingredients` | `items` | `{ created, skipped }` |

Las búsquedas sin resultados devuelven una lista vacía. Los errores viajan como `{ status, message }` (400 datos inválidos, 403 sin permiso, 404 inexistente, 409 conflicto) y el gateway los convierte en respuestas HTTP.

## Reglas de validación

- Título de 2 a 120 caracteres; hasta 10 categorías sin repetidos; porciones enteras de 1 a 100; de 1 a 50 pasos; de 1 a 60 ingredientes con cantidad mayor que cero; imagen opcional con URL `http` o `https`.
- No se aceptan campos que no correspondan (por ejemplo, calorías enviadas por el cliente o un cambio de autoría).
- Un ingrediente no puede repetirse dentro de una receta ni eliminarse mientras alguna receta lo use (409).
- Los nombres de ingrediente son únicos; los textos de búsqueda se tratan como texto literal, no como expresiones regulares.

## Requisitos

- Node.js 24 (ver `.nvmrc`).
- MongoDB y RabbitMQ. El `docker-compose.yml` del gateway los levanta.

## Puesta en marcha

```bash
cp .env.example .env
npm ci
npm run start:dev
```

| Variable | Descripción | Por defecto |
|---|---|---|
| `MONGODB_URI` | Conexión a MongoDB | obligatoria |
| `AMQP_URI` | Conexión a RabbitMQ | `amqp://localhost:5672` |
| `RECIPES_QUEUE` | Cola que escucha | `recipes_queue` |

## Pruebas

```bash
npm test
npm run test:cov
npm run lint
```

Las pruebas levantan el servicio completo (validación y errores incluidos) sobre transporte TCP y lo consultan como lo haría el gateway; necesitan una MongoDB en `MONGODB_URI` (por defecto `mongodb://localhost:27018/remi_recetas_test`) y borran su base de pruebas al terminar. El CI ejecuta lint, compilación y pruebas con cobertura.

## Docker

```bash
docker build -t remi-ms-recetas .
docker run --env-file .env remi-ms-recetas
```

## Autoría

Proyecto desarrollado en equipo durante la carrera. Esta copia forma parte del portafolio de [Florencia Peña Sepúlveda](https://github.com/florenciaPenaSepulveda), que la revisó, corrigió y documentó.
