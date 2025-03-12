#!/bin/bash
# Script to update all markdown links to point to the new documentation structure

# Make the script exit on any error
set -e

echo "Updating documentation links to match new structure..."

# Create a backup directory for original files
mkdir -p /home/erfi/api-gateway-workers/docs/backup
cp -r /home/erfi/api-gateway-workers/docs/*.md /home/erfi/api-gateway-workers/docs/guides /home/erfi/api-gateway-workers/docs/reference /home/erfi/api-gateway-workers/docs/architecture /home/erfi/api-gateway-workers/docs/development /home/erfi/api-gateway-workers/docs/backup/

# Update links to API.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*API\.md)|\[API Reference\](../reference/api-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/API\.md)|\[API Reference\](../reference/api-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/API\.md)|\[API Reference\](/docs/reference/api-reference.md)|g' {} \;

# Update links to CONFIGURATION.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*CONFIGURATION\.md)|\[Configuration Reference\](../reference/configuration-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/CONFIGURATION\.md)|\[Configuration Reference\](../reference/configuration-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/CONFIGURATION\.md)|\[Configuration Reference\](/docs/reference/configuration-reference.md)|g' {} \;

# Update links to configuration.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*configuration\.md)|\[Configuration Guide\](../guides/configuration-guide.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/configuration\.md)|\[Configuration Guide\](../guides/configuration-guide.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/configuration\.md)|\[Configuration Guide\](/docs/guides/configuration-guide.md)|g' {} \;

# Update links to CONFIGURATION_ROADMAP.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*CONFIGURATION_ROADMAP\.md)|\[Development Roadmap\](../development/roadmap.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/CONFIGURATION_ROADMAP\.md)|\[Development Roadmap\](../development/roadmap.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/CONFIGURATION_ROADMAP\.md)|\[Development Roadmap\](/docs/development/roadmap.md)|g' {} \;

# Update links to env-vars-cheatsheet.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*env-vars-cheatsheet\.md)|\[Environment Variables Cheatsheet\](../reference/env-vars-cheatsheet.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/env-vars-cheatsheet\.md)|\[Environment Variables Cheatsheet\](../reference/env-vars-cheatsheet.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/env-vars-cheatsheet\.md)|\[Environment Variables Cheatsheet\](/docs/reference/env-vars-cheatsheet.md)|g' {} \;

# Update links to ARCHITECTURE.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*ARCHITECTURE\.md)|\[Architecture Overview\](../architecture/overview.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/ARCHITECTURE\.md)|\[Architecture Overview\](../architecture/overview.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/ARCHITECTURE\.md)|\[Architecture Overview\](/docs/architecture/overview.md)|g' {} \;

# Update links to ORGANIZATION.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*ORGANIZATION\.md)|\[Directory Structure\](../architecture/directory-structure.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/ORGANIZATION\.md)|\[Directory Structure\](../architecture/directory-structure.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/ORGANIZATION\.md)|\[Directory Structure\](/docs/architecture/directory-structure.md)|g' {} \;

# Update links to COMMAND_PATTERN.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*COMMAND_PATTERN\.md)|\[Command Pattern\](../architecture/command-pattern.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/COMMAND_PATTERN\.md)|\[Command Pattern\](../architecture/command-pattern.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/COMMAND_PATTERN\.md)|\[Command Pattern\](/docs/architecture/command-pattern.md)|g' {} \;

# Update links to GATEWAY.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*GATEWAY\.md)|\[API Gateway Features\](../architecture/api-gateway.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/GATEWAY\.md)|\[API Gateway Features\](../architecture/api-gateway.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/GATEWAY\.md)|\[API Gateway Features\](/docs/architecture/api-gateway.md)|g' {} \;

# Update links to ERROR_HANDLING.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*ERROR_HANDLING\.md)|\[Error Reference\](../reference/error-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/ERROR_HANDLING\.md)|\[Error Reference\](../reference/error-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/ERROR_HANDLING\.md)|\[Error Reference\](/docs/reference/error-reference.md)|g' {} \;

# Update links to SECURITY.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*SECURITY\.md)|\[Security Reference\](../reference/security-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/SECURITY\.md)|\[Security Reference\](../reference/security-reference.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/SECURITY\.md)|\[Security Reference\](/docs/reference/security-reference.md)|g' {} \;

# Update links to QUICKSTART.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*QUICKSTART\.md)|\[Quick Start Guide\](../guides/quick-start.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/QUICKSTART\.md)|\[Quick Start Guide\](../guides/quick-start.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/QUICKSTART\.md)|\[Quick Start Guide\](/docs/guides/quick-start.md)|g' {} \;

# Update links to TUTORIALS.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*TUTORIALS\.md)|\[Tutorials\](../guides/tutorials.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/TUTORIALS\.md)|\[Tutorials\](../guides/tutorials.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/TUTORIALS\.md)|\[Tutorials\](/docs/guides/tutorials.md)|g' {} \;

# Update links to INTEGRATION_GUIDE.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*INTEGRATION_GUIDE\.md)|\[Integration Guide\](../guides/integration-guide.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/INTEGRATION_GUIDE\.md)|\[Integration Guide\](../guides/integration-guide.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/INTEGRATION_GUIDE\.md)|\[Integration Guide\](/docs/guides/integration-guide.md)|g' {} \;

# Update links to CONTRIBUTING.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*CONTRIBUTING\.md)|\[Contributing Guide\](../development/contributing.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/CONTRIBUTING\.md)|\[Contributing Guide\](../development/contributing.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/CONTRIBUTING\.md)|\[Contributing Guide\](/docs/development/contributing.md)|g' {} \;

# Update links to TESTING_GUIDE.md and TESTING_METHODOLOGY.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*TESTING_GUIDE\.md)|\[Testing Guide\](../development/testing.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/TESTING_GUIDE\.md)|\[Testing Guide\](../development/testing.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/TESTING_GUIDE\.md)|\[Testing Guide\](/docs/development/testing.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*TESTING_METHODOLOGY\.md)|\[Testing Guide\](../development/testing.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/TESTING_METHODOLOGY\.md)|\[Testing Guide\](../development/testing.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/TESTING_METHODOLOGY\.md)|\[Testing Guide\](/docs/development/testing.md)|g' {} \;

# Update links to IMPROVEMENTS.md
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](.*IMPROVEMENTS\.md)|\[Improvements\](../development/improvements.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\.\.\/IMPROVEMENTS\.md)|\[Improvements\](../development/improvements.md)|g' {} \;
find /home/erfi/api-gateway-workers/docs -name "*.md" -type f -exec sed -i 's|\[.*\](\/docs\/IMPROVEMENTS\.md)|\[Improvements\](/docs/development/improvements.md)|g' {} \;

echo "Link updates completed!"