# ==========================================
# TU-North CPMS Backend Dockerfile
# Multi-stage build for Go Fiber & GORM
# ==========================================

# Stage 1: Build binary
FROM golang:alpine AS builder

WORKDIR /build

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /build/server ./cmd/server

# Stage 2: Minimal runtime image
FROM alpine:3.21

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata \
    && cp /usr/share/zoneinfo/Asia/Bangkok /etc/localtime \
    && echo "Asia/Bangkok" > /etc/timezone

COPY --from=builder /build/server /app/server
COPY --from=builder /build/.env.example /app/.env.example

# Create upload directory
RUN mkdir -p /app/uploads

EXPOSE 8009

ENV PORT=8009 \
    ENVIRONMENT=production

CMD ["/app/server"]
