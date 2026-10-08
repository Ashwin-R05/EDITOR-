# TECH AUCTION - Hardened Isolated C Code Execution Sandbox
FROM alpine:3.19

# Install GCC, musl development headers, libc-dev, and coreutils (timeout, kill, etc.)
RUN apk add --no-cache gcc musl-dev libc-dev coreutils

# Create an isolated unprivileged non-root user
RUN adduser -D -u 10001 -s /bin/sh sandbox

# Set working directory with restricted permissions
WORKDIR /sandbox
RUN chown -R sandbox:sandbox /sandbox

# Switch to non-root sandbox user
USER sandbox

CMD ["/bin/sh"]
