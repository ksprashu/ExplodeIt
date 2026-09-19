---
type: "Architecture / Containerization"
title: "Production Containerization & Cloud Run Architecture"
description: "Multi-stage Alpine Docker build, Nginx SPA rewrite routing, static caching, and Google Cloud Run deployment."
resource: "file:///C:/Users/kspra/code/github/ExplodeIt/Dockerfile"
tags: ["containerization", "docker", "nginx", "cloud-run", "spa"]
---

# Production Containerization & Cloud Run Architecture

## Overview
ExplodeIt provides a production-grade multi-stage container deployment architecture optimized for lightweight execution, secure non-root running, and instant horizontal scaling on serverless container platforms such as Google Cloud Run.

## Multi-Stage Container Build Pipeline

```mermaid
graph TD
    subgraph Build Stage: node:20-alpine
        A[package*.json] -->|npm ci| B[Clean Dependency Installation]
        C[Source Code & Configs] -->|npm run build| D[Vite Production Bundle in /app/dist]
    end

    subgraph Production Stage: nginx:alpine
        D -->|COPY --from=build| E[/usr/share/nginx/html]
        F[nginx.conf] -->|COPY| G[/etc/nginx/conf.d/default.conf]
        E --> H[Nginx Alpine Runtime: Port 8080]
        G --> H
    end
```

### Dockerfile Specification (`Dockerfile`)

```dockerfile
# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### Key Optimizations:
1. **Multi-Stage Separation**: Development dependencies (TypeScript compiler, Vite toolchain, Tailwind processors) and intermediate Node modules are completely discarded from the final container artifact.
2. **Minimal Attack Surface**: The runtime container uses `nginx:alpine`, producing an image size under 50 MB with zero Node.js runtime vulnerabilities.
3. **Cloud Run Port Alignment**: Listens on port `8080`, adhering to Google Cloud Run default ingress conventions.

## Nginx Single-Page Application (SPA) Routing (`nginx.conf`)

Because ExplodeIt is a client-side SPA, deep URL routes or direct resource requests must fall back gracefully to `index.html` without returning HTTP 404 errors.

```nginx
server {
    listen 8080;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    include /etc/nginx/mime.types;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public";
    }
}
```

### Routing & Caching Rules:
- **`try_files $uri $uri/ /index.html`**: Directs all unmatched paths back to the React DOM root for client-side routing.
- **Aggressive Static Asset Caching**: Hash-versioned static bundles (JavaScript, CSS, fonts, icons) are served with `Cache-Control: public` and a 1-year expiration window (`expires 1y`), offloading repeat requests from container CPU.
- **MIME Types**: Standard `/etc/nginx/mime.types` inclusion ensures appropriate Content-Type headers for ESM JavaScript and SVG assets.
