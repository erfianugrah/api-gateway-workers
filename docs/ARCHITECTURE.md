# Architecture Documentation

This document provides a detailed overview of the API Gateway's architecture, including the authentication system, role-based access control, and gateway functionality.

## System Architecture

The service is built on Cloudflare Workers with Durable Objects, providing a globally distributed, highly available API key management and gateway service without a separate database.

```mermaid
flowchart TB
    subgraph "Edge Network"
        A["API Request<br>HTTP/HTTPS"] -->|Request| B["Cloudflare Worker<br>Entry Point"]
        B <--> E["KV Storage"]
    end
    
    subgraph "Key Management"
        B --> C["Key Manager<br>Durable Object"]
        C --> D["Persistent Storage<br>Durable Objects"]
    end
    
    subgraph "API Gateway"
        C --> F["Enhanced Router"]
        F --> G["ProxyService"]
        G -->|Forward| H["Upstream<br>Services"]
        
        G --> CB[Circuit Breaker]
        G --> RT[Retry Logic]
        G --> VE[Version Engine]
    end
    
    subgraph "Security Layer"
        B -->|Validate| AUTH[Authentication]
        AUTH -->|Verify| RBAC[Role-Based Access]
        RBAC -->|Log| AUDIT[Audit Logging]
        C -->|Encrypt| SEC[Security Services]
    end
    
    style A fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style B fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style C fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style D fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style E fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style F fill:#663333,stroke:#cc8888,stroke-width:2px,color:#ffffff
    style G fill:#336633,stroke:#88cc88,stroke-width:2px,color:#ffffff
    style H fill:#336666,stroke:#88cccc,stroke-width:2px,color:#ffffff
    style AUTH fill:#665533,stroke:#ccbb88,stroke-width:2px,color:#ffffff
    style RBAC fill:#665533,stroke:#ccbb88,stroke-width:2px,color:#ffffff
    style AUDIT fill:#665533,stroke:#ccbb88,stroke-width:2px,color:#ffffff
    style SEC fill:#665533,stroke:#ccbb88,stroke-width:2px,color:#ffffff
    style CB fill:#336633,stroke:#88cc88,stroke-width:2px,color:#ffffff
    style RT fill:#336633,stroke:#88cc88,stroke-width:2px,color:#ffffff
    style VE fill:#336633,stroke:#88cc88,stroke-width:2px,color:#ffffff
```

The updated architecture includes:
1. Cloudflare KV for admin information, authentication, and audit logging
2. Durable Objects for API key management and storage
3. Authentication middleware for role-based access control
4. Background maintenance processes with alarms
5. Enhanced routing with regex pattern support
6. Proxy service for forwarding requests to upstream services
7. Fault tolerance mechanisms like circuit breakers and retry logic

### Request Processing Pipeline

```mermaid
flowchart LR
    A["Client Request"] --> B["CORS Middleware"]
    B --> C["Auth Middleware"]
    C --> D["Rate Limiter"]
    D --> E["Request Parsing"]
    E --> F["Router Matching"]
    F --> G["Command Creation"]
    G --> H["Command Bus"]
    H --> I["Handler Execution"]
    I --> J["Response Formatting"]
    J --> K["Error Handling"]
    K --> L["Response to Client"]
    
    style A fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style B fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style C fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style D fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style E fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style F fill:#663333,stroke:#cc8888,stroke-width:2px,color:#ffffff
    style G fill:#336633,stroke:#88cc88,stroke-width:2px,color:#ffffff
    style H fill:#336666,stroke:#88cccc,stroke-width:2px,color:#ffffff
    style I fill:#336666,stroke:#88cccc,stroke-width:2px,color:#ffffff
    style J fill:#665533,stroke:#ccbb88,stroke-width:2px,color:#ffffff
    style K fill:#665533,stroke:#ccbb88,stroke-width:2px,color:#ffffff
    style L fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Worker
    participant AuthMiddleware as Auth Middleware
    participant RBAC as Permission Check
    participant Storage as Durable Object
    participant Audit as Audit Logger
    
    Client->>Worker: Request with X-API-Key
    Worker->>AuthMiddleware: Forward request
    
    AuthMiddleware->>Storage: Find key
    Storage-->>AuthMiddleware: Return key data
    
    alt Key not found
        AuthMiddleware-->>Client: 401 Unauthorized
    else Key found
        AuthMiddleware->>RBAC: Check permissions
        
        alt Has permission
            RBAC-->>AuthMiddleware: Authorized
            AuthMiddleware->>Audit: Log access
            AuthMiddleware->>Worker: Continue processing
            Worker->>Storage: Execute operation
            Storage-->>Worker: Return result
            Worker-->>Client: 200 OK with result
        else No permission
            RBAC-->>AuthMiddleware: Unauthorized
            AuthMiddleware->>Audit: Log attempt
            AuthMiddleware-->>Client: 403 Forbidden
        end
    end
```

1. Client sends a request with an admin API key in the X-Api-Key header
2. Worker authenticates the request using the auth middleware
3. Permissions are checked based on the admin's role
4. Actions are logged for audit purposes
5. Request is forwarded to the Durable Object if authorized

## Clean Architecture Implementation

The system follows Clean Architecture principles with distinct layers:

```mermaid
graph TD
    subgraph "Outer: API & Infrastructure"
        A1["Controllers"]
        A2["Middleware"]
        A3["Router"]
        I1["Durable Objects"]
        I2["KV Storage"]
        I3["Config"]
        I4["DI Container"]
    end
    
    subgraph "Middle: Application"
        B1["Commands"]
        B2["Command Bus"]
        B3["Command Handlers"]
    end
    
    subgraph "Inner: Domain"
        C1["Domain Services"]
        C2["Entities"]
        C3["Value Objects"]
        C4["Repositories (Interface)"]
    end
    
    A1 --> B1
    A1 --> B2
    A2 --> A1
    A3 --> A1
    
    B2 --> B3
    B3 --> C1
    B3 --> C4
    
    C1 --> C2
    C1 --> C3
    C1 --> C4
    
    I1 -.->|implements| C4
    I2 -.->|implements| C4
    I3 -.->|configures| C1
    I3 -.->|configures| B3
    I4 -.->|injects| C1
    I4 -.->|injects| B3
    I4 -.->|injects| A1
    
    style A1 fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style A2 fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style A3 fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style B1 fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style B2 fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style B3 fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style C1 fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style C2 fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style C3 fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style C4 fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style I1 fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style I2 fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style I3 fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style I4 fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
```

The key principle is that dependencies only point inward, with domain logic completely independent of frameworks or infrastructure. This ensures we can change storage, API layer, or other infrastructure without impacting business logic.

## Key Components

### 1. Worker Entry Point (`index.js`)

```mermaid
flowchart TB
    Entry[index.js] --> Setup[Setup handling]
    Entry --> Routing[Request routing]
    Entry --> Auth[Auth middleware]
    Entry --> Error[Global error handling]
    Entry --> CORS[CORS handling]
    
    subgraph "Durable Object Management"
        Routing --> Stub[DO Stub Creation]
        Stub --> Name[DO Name Generation]
        Stub --> FetchAPI[Fetch API Bridge]
    end
    
    style Entry fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Setup fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Routing fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Auth fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Error fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style CORS fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Stub fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Name fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style FetchAPI fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
```

The main Worker script acts as the entry point, handling incoming HTTP requests and routing them to the appropriate Durable Object.

Major responsibilities:
- First-time setup handling
- Request routing to Durable Objects
- Authentication middleware integration
- Admin information extraction
- Global error handling
- CORS configuration and handling

### 2. API Layer (`api/` directory)

```mermaid
classDiagram
    class BaseController {
        #container: Container
        #commandBus: CommandBus
        #validate(data, schema): void
        #execute(command): Promise~any~
        #success(data, status): Response
        #error(message, status): Response
    }
    
    class KeysController {
        +create(request): Promise~Response~
        +list(request): Promise~Response~
        +listWithCursor(request): Promise~Response~
        +get(request): Promise~Response~
        +revoke(request): Promise~Response~
        +rotate(request): Promise~Response~
    }
    
    class SystemController {
        +health(request): Promise~Response~
        +setup(request): Promise~Response~
        +maintenance(request): Promise~Response~
    }
    
    class ValidationController {
        +validate(request): Promise~Response~
    }
    
    class Middleware {
        <<interface>>
        +handle(request, next): Promise~Response~
    }
    
    class AuthMiddleware {
        -authService: AuthService
        +handle(request, scopes): Promise~Response~
    }
    
    class ErrorHandler {
        +handle(error, request): Promise~Response~
    }
    
    BaseController <|-- KeysController
    BaseController <|-- SystemController
    BaseController <|-- ValidationController
    
    Middleware <|.. AuthMiddleware
    Middleware <|.. ErrorHandler
    
    KeysController --> BaseController
    SystemController --> BaseController
    ValidationController --> BaseController
```

The API layer handles HTTP requests and responses:

#### Controllers

- `api/controllers/BaseController.js` - Base controller with common functionality
- `api/controllers/KeysController.js` - Manages API key operations
- `api/controllers/SystemController.js` - Handles system-level operations
- `api/controllers/ValidationController.js` - Validates API keys

#### Middleware

- `api/middleware/authMiddleware.js` - Authentication and authorization
- `api/middleware/corsMiddleware.js` - CORS support
- `api/middleware/errorHandler.js` - Error handling and formatting
- `api/middleware/responseMiddleware.js` - Response formatting

### 3. Application Layer (`core/*/handlers/` directories)

```mermaid
classDiagram
    class Command {
        <<abstract>>
        +validate(): void
    }
    
    class CommandHandler {
        <<abstract>>
        +handle(command): Promise~any~
    }
    
    class CommandBus {
        -handlers: Map
        +registerHandler(commandType, handler): void
        +dispatch(command): Promise~any~
    }
    
    class CreateKeyCommand {
        +name: string
        +owner: string
        +scopes: string[]
        +expiresAt: number
        +validate(): void
    }
    
    class ValidateKeyCommand {
        +key: string
        +scopes: string[]
        +validate(): void
    }
    
    class CreateKeyHandler {
        -keyService: KeyService
        +handle(command): Promise~KeyData~
    }
    
    class ValidateKeyHandler {
        -keyService: KeyService
        +handle(command): Promise~ValidationResult~
    }
    
    Command <|-- CreateKeyCommand
    Command <|-- ValidateKeyCommand
    
    CommandHandler <|-- CreateKeyHandler
    CommandHandler <|-- ValidateKeyHandler
    
    CommandBus --> CommandHandler
    
    CreateKeyHandler --> KeyService
    ValidateKeyHandler --> KeyService
```

The application layer implements use cases through command handlers:

- `core/keys/handlers/CreateKeyHandler.js` - Creates new API keys
- `core/keys/handlers/RevokeKeyHandler.js` - Revokes existing keys
- `core/keys/handlers/RotateKeyHandler.js` - Rotates keys with grace periods
- `core/keys/handlers/ValidateKeyHandler.js` - Validates keys and scopes
- `core/keys/handlers/ListKeysHandler.js` - Lists keys with pagination
- `core/keys/handlers/GetKeyHandler.js` - Retrieves key details
- `core/keys/handlers/CleanupExpiredKeysHandler.js` - Cleans up expired keys

### 4. Domain Layer (`core/` directory)

```mermaid
classDiagram
    class KeyService {
        -repository: KeyRepository
        -encryptionService: EncryptionService
        -hmacService: HmacService
        -keyGenerator: KeyGenerator
        +createKey(data): Promise~KeyData~
        +getKey(id): Promise~KeyData~
        +listKeys(options): Promise~KeyList~
        +validateKey(key, scopes): Promise~ValidationResult~
        +revokeKey(id, reason): Promise~RevokeResult~
        +rotateKey(id, options): Promise~RotateResult~
    }
    
    class KeyRepository {
        <<interface>>
        +store(key): Promise~void~
        +find(id): Promise~KeyData~
        +findByValue(value): Promise~KeyData~
        +list(options): Promise~KeyList~
        +delete(id): Promise~void~
        +update(id, data): Promise~void~
    }
    
    class AuthService {
        -keyService: KeyService
        +validateAdmin(apiKey): Promise~AdminInfo~
        +hasPermission(apiKey, requiredScope): boolean
    }
    
    class EncryptionService {
        -encryptionKey: string
        +encrypt(data): Promise~EncryptedData~
        +decrypt(ciphertext): Promise~string~
    }
    
    class HmacService {
        -hmacSecret: string
        +sign(data): Promise~Signature~
        +verify(data, signature): Promise~boolean~
    }
    
    class KeyGenerator {
        +generate(): Promise~string~
        +generateId(): Promise~UUID~
    }
    
    class AuditLogger {
        -storage: Storage
        +log(adminId, action, details): Promise~void~
        +getLogsByAdmin(adminId, limit): Promise~LogEntries~
        +getLogsByAction(action, limit): Promise~LogEntries~
    }
    
    KeyService --> KeyRepository
    KeyService --> EncryptionService
    KeyService --> HmacService
    KeyService --> KeyGenerator
    
    AuthService --> KeyService
    AuditLogger --> KeyRepository
```

The domain layer contains the business logic and domain entities:

#### Command Objects

- `core/command/Command.js` - Base command class
- `core/command/CommandBus.js` - Command dispatching
- `core/command/CommandHandler.js` - Base handler interface
- `core/keys/commands/*.js` - Command objects for key operations

#### Domain Services

- `core/keys/KeyService.js` - Domain service for key operations
- `core/keys/KeyRepository.js` - Repository interface
- `core/auth/AuthService.js` - Authentication and authorization
- `core/security/*.js` - Encryption, HMAC, key generation
- `core/audit/AuditLogger.js` - Audit logging service

### 5. Infrastructure Layer

```mermaid
classDiagram
    class KeyRepository {
        <<interface>>
        +store(key): Promise~void~
        +find(id): Promise~KeyData~
        +findByValue(value): Promise~KeyData~
        +list(options): Promise~KeyList~
        +delete(id): Promise~void~
        +update(id, data): Promise~void~
    }
    
    class DurableObjectRepository {
        -storage: Storage
        +store(key): Promise~void~
        +find(id): Promise~KeyData~
        +findByValue(value): Promise~KeyData~
        +list(options): Promise~KeyList~
        +delete(id): Promise~void~
        +update(id, data): Promise~void~
    }
    
    class Container {
        -services: Map
        +register(name, factory): void
        +registerSingleton(name, instance): void
        +has(name): boolean
        +get(name): any
    }
    
    class Config {
        -values: Map
        +get(key, defaultValue): any
        +set(key, value): void
        +has(key): boolean
    }
    
    class Router {
        -routes: Route[]
        +get(path, handler): void
        +post(path, handler): void
        +put(path, handler): void
        +delete(path, handler): void
        +all(path, handler): void
        +use(middleware): void
        +handleRequest(request): Promise~Response~
    }
    
    class ProxyService {
        -config: Config
        -circuitBreakers: Map
        +proxyRequest(request, service, path): Promise~Response~
        +getCircuitStatus(): CircuitStatus
        +resetCircuit(service): void
    }
    
    KeyRepository <|.. DurableObjectRepository
    
    Router --> ProxyService
    ProxyService --> Config
```

The infrastructure layer provides technical capabilities:

#### Storage

- `infrastructure/storage/DurableObjectRepository.js` - Durable Objects storage implementation

#### Configuration

- `infrastructure/config/Config.js` - Configuration management
- `infrastructure/config/setupConfig.js` - Environment configuration

#### Dependency Injection

- `infrastructure/di/Container.js` - IoC container
- `infrastructure/di/setupContainer.js` - Service registration

#### HTTP

- `infrastructure/http/Router.js` - Enhanced HTTP request routing with regex support, validation, versioning, and proxy capabilities

#### Proxy

- `core/proxy/ProxyService.js` - Handles forwarding requests to upstream services

### 6. Legacy Auth Module (`auth/` directory)

The legacy authentication module provides role-based access control.

### 7. Key Manager Durable Object (`lib/KeyManagerDurableObject.js`)

```mermaid
classDiagram
    class KeyManagerDurableObject {
        -state: DurableObjectState
        -storage: Storage
        -router: Router
        -container: Container
        -config: Config
        +constructor(state, env)
        +fetch(request): Promise~Response~
        +alarm(): Promise~void~
    }
    
    class Router {
        -routes: Route[]
        +get(path, handler): void
        +post(path, handler): void
        +put(path, handler): void
        +delete(path, handler): void
        +all(path, handler): void
        +use(middleware): void
        +handleRequest(request): Promise~Response~
    }
    
    class Container {
        -services: Map
        +register(name, factory): void
        +registerSingleton(name, instance): void
        +has(name): boolean
        +get(name): any
    }
    
    KeyManagerDurableObject --> Router: contains
    KeyManagerDurableObject --> Container: contains
    KeyManagerDurableObject --> Storage: uses
```

The core Durable Object that provides the API key management functionality with persistent state.

Key responsibilities:
- Manages internal routing via the Router
- Provides data persistence via Durable Object storage
- Runs periodic maintenance via Durable Object alarms
- Integrates with the authentication system
- Uses the dependency injection container to resolve services

### 8. Utility Modules

Several utility modules provide supporting functionality:

- `utils/security.js`: Cryptographic and security functions, including encryption/decryption
- `utils/storage.js`: Storage key generation and consistency
- `utils/response.js`: HTTP response formatting
- `utils/validation.js`: Input validation functions

## Role-Based Access Control

The authentication system implements role-based access control:

### Roles and Permission Model

```mermaid
graph TB
    subgraph "Role Hierarchy"
        SUPER_ADMIN["SUPER_ADMIN<br>Full System Access"] --> KEY_ADMIN["KEY_ADMIN<br>Key Management Access"]
        SUPER_ADMIN --> USER_ADMIN["USER_ADMIN<br>User Management Access"]
        SUPER_ADMIN --> SUPPORT["SUPPORT<br>Limited Support Access"]
        KEY_ADMIN --> KEY_VIEWER["KEY_VIEWER<br>Read-only Key Access"]
        USER_ADMIN --> USER_VIEWER["USER_VIEWER<br>Read-only User Access"]
        CUSTOM["CUSTOM<br>Tailored Permissions"]
    end
    
    subgraph "Permission Categories"
        ADMIN_KEYS["admin:keys:*"] --> CREATE_KEYS["admin:keys:create"]
        ADMIN_KEYS --> READ_KEYS["admin:keys:read"]
        ADMIN_KEYS --> REVOKE_KEYS["admin:keys:revoke"]
        ADMIN_KEYS --> ROTATE_KEYS["admin:keys:rotate"]
        
        ADMIN_USERS["admin:users:*"] --> CREATE_USERS["admin:users:create"]
        ADMIN_USERS --> READ_USERS["admin:users:read"]
        ADMIN_USERS --> REVOKE_USERS["admin:users:revoke"]
        
        ADMIN_SYSTEM["admin:system:*"] --> SYSTEM_CONFIG["admin:system:config"]
        ADMIN_SYSTEM --> SYSTEM_MAINT["admin:system:maintenance"]
        ADMIN_SYSTEM --> SYSTEM_LOGS["admin:system:logs"]
    end
    
    SUPER_ADMIN -.-> ADMIN_KEYS
    SUPER_ADMIN -.-> ADMIN_USERS
    SUPER_ADMIN -.-> ADMIN_SYSTEM
    KEY_ADMIN -.-> CREATE_KEYS
    KEY_ADMIN -.-> READ_KEYS
    KEY_ADMIN -.-> REVOKE_KEYS
    KEY_ADMIN -.-> ROTATE_KEYS
    KEY_VIEWER -.-> READ_KEYS
    USER_ADMIN -.-> CREATE_USERS
    USER_ADMIN -.-> READ_USERS
    USER_ADMIN -.-> REVOKE_USERS
    USER_VIEWER -.-> READ_USERS
    SUPPORT -.-> READ_KEYS
    SUPPORT -.-> READ_USERS
    CUSTOM -.-> CUSTOM_PERMS["Custom Permission Set"]
    
    style SUPER_ADMIN fill:#335577,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style KEY_ADMIN fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style USER_ADMIN fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style SUPPORT fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style KEY_VIEWER fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style USER_VIEWER fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style CUSTOM fill:#555577,stroke:#88aacc,stroke-width:2px,color:#ffffff
```

Each role has a defined set of permissions:

1. **SUPER_ADMIN**: Full system access
   - admin:keys:* - All key operations
   - admin:users:* - All user operations 
   - admin:system:* - All system operations

2. **KEY_ADMIN**: API key management
   - admin:keys:create - Create new keys
   - admin:keys:read - View keys
   - admin:keys:revoke - Revoke keys

3. **KEY_VIEWER**: Read-only key access
   - admin:keys:read - View keys

4. **USER_ADMIN**: Admin user management
   - admin:users:create - Create admins
   - admin:users:read - View admins
   - admin:users:revoke - Revoke admin access

5. **SUPPORT**: Limited access for support
   - admin:keys:read - View keys
   - admin:users:read - View admins

6. **CUSTOM**: Custom permissions as specified

### Permission Checking

```mermaid
flowchart TB
    Request[Request with API Key] --> Extract[Extract API Key]
    Extract --> Lookup[Look up Admin Info]
    Lookup --> Check{Has Admin Info?}
    
    Check -->|Yes| GetScopes[Get Admin Scopes]
    Check -->|No| Reject[Reject with 401]
    
    GetScopes --> DirectMatch{Direct Match?}
    DirectMatch -->|Yes| Allow[Allow Request]
    DirectMatch -->|No| WildcardCheck{Wildcard Match?}
    
    WildcardCheck -->|Yes| Allow
    WildcardCheck -->|No| Reject2[Reject with 403]
    
    subgraph Example Matches
        direction LR
        Direct["Scope: admin:keys:read<br>Required: admin:keys:read"] -->|✓| DirectSuccess[Match]
        Wildcard["Scope: admin:keys:*<br>Required: admin:keys:read"] -->|✓| WildcardSuccess[Match]
        Failed["Scope: admin:keys:read<br>Required: admin:keys:create"] -->|✗| FailedMatch[No match]
    end
    
    style Allow fill:#5c5,stroke:#494,stroke-width:2px
    style Reject fill:#c55,stroke:#944,stroke-width:2px
    style Reject2 fill:#c55,stroke:#944,stroke-width:2px
```

All administrative endpoints check permissions before processing requests:

```javascript
// Check if admin has permission to list keys
if (!hasPermission(adminInfo, "admin:keys:read")) {
  return errorResponse("You do not have permission to list API keys", 403);
}
```

The `hasPermission()` function supports both direct and wildcard matches:

```javascript
// Direct match - the admin has exactly this permission
if (normalizedScope === normalizedRequired) {
  return true;
}

// Wildcard match at the end (e.g., "admin:keys:*")
if (normalizedScope.endsWith(":*")) {
  // Get the base scope (everything before the "*")
  const baseScope = normalizedScope.slice(0, -1);

  // If the required permission starts with this base, it's a match
  if (normalizedRequired.startsWith(baseScope)) {
    return true;
  }
}
```

## Comprehensive Audit Logging

The system logs all administrative actions for accountability:

```mermaid
graph TD
    subgraph "Audit Event Creation"
        Admin[Admin Action] --> Create[Create Log Entry]
        Create --> Store[Store in Storage]
        Create --> Index[Create Indices]
    end
    
    subgraph "Audit Storage Structure"
        Store --> Primary[Primary Record<br>log:admin:{id}]
        Index --> AdminIndex[Admin Index<br>log:admin:by_admin:{adminId}:{timestamp}_{id}]
        Index --> ActionIndex[Action Index<br>log:admin:by_action:{action}:{timestamp}_{id}]
        Index --> CriticalIndex[Critical Action Index<br>log:admin:critical:{timestamp}_{id}]
    end
    
    subgraph "Query Capabilities"
        Primary --> GetById[Get Log by ID]
        AdminIndex --> GetByAdmin[Get Logs by Admin]
        ActionIndex --> GetByAction[Get Logs by Action Type]
        CriticalIndex --> GetCritical[Get Critical Actions]
        
        GetByAdmin --> Paginate[Cursor Pagination]
        GetByAction --> Paginate
        GetCritical --> Paginate
    end
    
    subgraph "Analytics & Reporting"
        Paginate --> Export[Export to SIEM]
        Paginate --> Report[Generate Reports]
        Paginate --> Alert[Security Alerting]
    end
    
    style Create fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Store fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Index fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Export fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Report fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Alert fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
```

### Audit Log Structure

Each audit log entry contains:

```javascript
const logEntry = {
  id: logId,            // Unique log ID
  timestamp: Date.now(), // When the action occurred
  adminId: adminId,     // Who performed the action
  action: action,       // What action was performed
  details: details,     // Additional context
  ip: clientIp,         // Client IP address
  userAgent: userAgent  // Client user agent
};
```

### Log Categories and Indexing

The system maintains multiple indices for efficient log retrieval:

1. **By Admin**: Logs indexed by the admin who performed the action
   - `log:admin:by_admin:{adminId}:{timestamp}_{logId}`

2. **By Action**: Logs indexed by the action type
   - `log:admin:by_action:{action}:{timestamp}_{logId}`

3. **Critical Actions**: Special index for security-critical actions
   - `log:admin:critical:{timestamp}_{logId}`

Critical actions include:
- system_setup
- system_config_change
- system_rotate_keys
- create_admin
- revoke_admin
- update_admin_permissions
- revoke_key_batch
- key_rotation

## Key Rotation

The system supports two types of key rotation:

### 1. API Key Rotation

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Rotated: rotate()
    Rotated --> InGracePeriod: automatic
    InGracePeriod --> Expired: grace period ends
    InGracePeriod --> Revoked: manual revoke
    Active --> Revoked: manual revoke
    Expired --> [*]
    Revoked --> [*]
    
    state Active {
        [*] --> ValidateRequests
        ValidateRequests --> UpdateUsage
        UpdateUsage --> [*]
    }
    
    state Rotated {
        [*] --> CheckGracePeriod
        CheckGracePeriod --> WarnClient
        WarnClient --> ValidateRequestsRotated
        ValidateRequestsRotated --> UpdateUsage
        UpdateUsage --> [*]
    }
    
    state InGracePeriod {
        [*] --> AddWarningHeader
        AddWarningHeader --> [*]
    }
```

The API key rotation process:
1. Original key is marked as "rotated" with a pointer to the new key
2. New key is created with the same or updated properties
3. A rotation record tracks the grace period
4. Both keys work during the grace period
5. After the grace period, only the new key is valid
6. System cleans up expired rotation records

### 2. Cryptographic Material Rotation

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant KeyMgr as Key Manager
    participant KeySvc as Key Service
    participant Crypto as Crypto Services
    participant Storage as Storage
    
    Admin->>KeyMgr: Initiate crypto rotation
    KeyMgr->>KeySvc: rotateEncryptionMaterial(oldSecret, newSecret)
    
    loop For Each Key
        KeySvc->>Storage: Get encrypted key
        Storage-->>KeySvc: Return encrypted data
        KeySvc->>Crypto: Decrypt with old secret
        Crypto-->>KeySvc: Return plaintext
        KeySvc->>Crypto: Encrypt with new secret
        Crypto-->>KeySvc: Return new ciphertext
        KeySvc->>Storage: Store updated encryption
    end
    
    KeyMgr->>KeySvc: rotateHmacMaterial(oldSecret, newSecret)
    
    loop For Each HMAC
        KeySvc->>Storage: Get key value
        Storage-->>KeySvc: Return key data
        KeySvc->>Crypto: Generate new HMAC
        Crypto-->>KeySvc: Return new signature
        KeySvc->>Storage: Update HMAC signature
    end
    
    KeyMgr->>Admin: Return rotation summary
```

For sensitive security operations, the system can rotate the underlying encryption and HMAC secrets:

```javascript
// Rotate encryption material
const encryptionCount = await rotateEncryptionMaterial(
  this.state.storage,
  oldSecret,
  newSecret
);

// Rotate HMAC signatures
const hmacCount = await rotateHmacMaterial(
  this.state.storage,
  oldSecret,
  newSecret
);
```

This process:
1. Decrypts all API keys using the old secret
2. Re-encrypts them with the new secret
3. Updates all HMAC signatures with the new secret
4. Maintains comprehensive logs of the rotation process

## API Flow

### Creating an API Key

```mermaid
sequenceDiagram
    participant Client
    participant Worker
    participant DO as Durable Object
    participant KeySvc as Key Service
    participant Crypto as Encryption & HMAC
    participant Storage
    
    Client->>Worker: POST /keys with API key data
    Worker->>Worker: Authenticate admin
    Worker->>Worker: Check permissions
    Worker->>DO: Forward authenticated request
    
    DO->>KeySvc: createKey(data)
    KeySvc->>Crypto: Generate secure random key
    Crypto-->>KeySvc: Return generated key
    
    KeySvc->>Crypto: Encrypt key for storage
    Crypto-->>KeySvc: Return encrypted data
    
    KeySvc->>Crypto: Generate HMAC signature
    Crypto-->>KeySvc: Return HMAC signature
    
    KeySvc->>Storage: Store key data
    KeySvc->>Storage: Create lookup index
    KeySvc->>Storage: Store HMAC signature
    KeySvc->>Storage: Create timestamp index
    
    Storage-->>KeySvc: Confirm storage
    KeySvc-->>DO: Return key details
    
    DO->>DO: Log to audit system
    DO-->>Worker: Return key details
    Worker-->>Client: Return key data and value
    
    Note over Client,Storage: Only the encrypted key is stored
    Note over Client,Storage: Key value is only shown once
```

1. Client sends a POST request to `/keys` with an admin API key
2. Worker authenticates the request and checks permissions
3. If authorized, the request is routed to the Key Manager Durable Object
4. ApiKeyManager generates a secure random key
5. The key is encrypted for storage
6. An HMAC signature is generated for the key
7. The key and associated metadata are stored in Durable Object storage
8. Multiple storage indices are created for efficient lookup
9. The action is logged in the audit system
10. The full key details are returned to the client

### Validating an API Key

```mermaid
sequenceDiagram
    participant Client
    participant Worker
    participant DO as Durable Object
    participant KeySvc as Key Service
    participant Crypto as Encryption & HMAC
    participant Storage
    
    Client->>Worker: POST /validate with API key
    Worker->>DO: Forward validation request
    
    DO->>KeySvc: validateKey(key, scopes)
    
    KeySvc->>Storage: Find key by value (lookup index)
    Storage-->>KeySvc: Return key ID or null
    
    alt Key not found
        KeySvc-->>DO: Return invalid result
        DO-->>Worker: Return invalid result
        Worker-->>Client: Return invalid response
    else Key found
        KeySvc->>Storage: Get key data by ID
        Storage-->>KeySvc: Return key data
        
        KeySvc->>Crypto: Verify HMAC signature
        Crypto-->>KeySvc: Return verification result
        
        alt Invalid signature
            KeySvc-->>DO: Return invalid result
            DO-->>Worker: Return invalid result
            Worker-->>Client: Return invalid response
        else Valid signature
            KeySvc->>KeySvc: Check key status
            KeySvc->>KeySvc: Check expiration
            KeySvc->>KeySvc: Validate scopes
            
            alt Key is rotated
                KeySvc->>Storage: Get rotation record
                Storage-->>KeySvc: Return rotation data
                KeySvc->>KeySvc: Check grace period
            end
            
            KeySvc->>Storage: Update lastUsedAt (non-blocking)
            
            KeySvc-->>DO: Return validation result
            DO-->>Worker: Return validation result
            Worker-->>Client: Return validation response
        end
    end
```

1. Client sends a POST request to `/validate` with an API key
2. The request is routed to the Key Manager Durable Object
3. The key ID is looked up using the fast lookup index
4. The HMAC signature is verified for additional security
5. Key status (active/revoked/rotated) is checked
6. Expiration is checked (expired keys are auto-revoked)
7. If scopes are requested, they are validated against the key's scopes
8. For rotated keys, rotation status and grace period are checked
9. Usage timestamp is updated (non-blocking)
10. Validation result is returned to the client

### First-Time Setup Flow

```mermaid
sequenceDiagram
    participant Client
    participant Worker
    participant KV
    participant AuthSvc
    participant AuditLog
    
    Client->>Worker: POST /setup with admin info
    Worker->>KV: Check setup_completed flag
    KV-->>Worker: Return flag value
    
    alt Setup already completed
        Worker-->>Client: Return error
    else First time setup
        Worker->>AuthSvc: Create super admin
        AuthSvc->>AuthSvc: Generate admin key
        AuthSvc->>KV: Store admin key
        AuthSvc->>KV: Store lookup index
        AuthSvc->>KV: Store admin record
        AuthSvc-->>Worker: Return admin details
        
        Worker->>KV: Set setup_completed flag
        Worker->>AuditLog: Log setup action
        
        Worker-->>Client: Return admin key (once-only)
    end
```

1. Client sends a POST request to `/setup` with admin data
2. Worker checks if setup has already been completed
3. If not completed, creates the first admin with SUPER_ADMIN role
4. Sets a flag indicating setup is complete
5. Logs the setup action in the audit system
6. Returns the admin API key to the client (only shown once)

## Data Model

### API Key Structure

```mermaid
classDiagram
    class ApiKey {
        id: string
        name: string
        owner: string
        email: string
        scopes: string[]
        status: "active" | "revoked" | "rotated"
        createdAt: number
        expiresAt: number
        lastUsedAt: number
        encryptedKey: EncryptedData
        rotatedAt: number
        rotatedToId: string
        rotatedFromId: string
    }
    
    class EncryptedData {
        encryptedData: string
        iv: string
        salt: string
        iterations: number
        version: number
    }
    
    class RotationRecord {
        originalKeyId: string
        newKeyId: string
        rotatedAt: number
        gracePeriodEnds: number
        status: "active" | "expired"
    }
    
    class AuditLogEntry {
        id: string
        timestamp: number
        adminId: string
        action: string
        details: object
        ip: string
        userAgent: string
    }
    
    ApiKey --> EncryptedData
    ApiKey --> RotationRecord: references
```

Each API key stored in the system has the following structure:

```javascript
{
  id: "uuid-string",              // Unique identifier (UUID)
  name: "My API Key",             // Descriptive name
  owner: "user@example.com",      // Key owner
  email: "contact@example.com",   // Owner email (optional)
  scopes: ["read:data"],          // Permission scopes
  status: "active",               // Status (active, revoked, or rotated)
  createdAt: 1677609600000,       // Creation timestamp (ms)
  expiresAt: 1735689600000,       // Expiration timestamp (ms, 0 = never)
  lastUsedAt: 1677695999000,      // Last usage timestamp (ms)
  encryptedKey: {                 // Encrypted key data (not exposed to clients)
    encryptedData: "hex-string",
    iv: "hex-string",
    salt: "hex-string",
    iterations: 100000,
    version: 2
  },
  rotatedAt: 1677609600000,       // When the key was rotated (if applicable)
  rotatedToId: "uuid-string",     // ID of the new key (if rotated)
  rotatedFromId: "uuid-string",   // ID of the old key (if this is a rotated key)
}
```

### Rotation Record Structure

```javascript
{
  originalKeyId: "uuid-string",    // Original key ID
  newKeyId: "uuid-string",         // New key ID
  rotatedAt: 1677609600000,        // When rotation occurred
  gracePeriodEnds: 1680288000000,  // When grace period ends
  status: "active"                 // Rotation status
}
```

### Audit Log Structure

```javascript
{
  id: "log-uuid",                 // Unique log ID
  timestamp: 1677609600000,       // When the action occurred
  adminId: "admin-uuid",          // Who performed the action
  action: "create_key",           // What action was performed
  details: {                      // Action-specific details
    keyId: "key-uuid",
    name: "New API Key"
  },
  ip: "192.168.1.1",              // Client IP address
  userAgent: "Mozilla/5.0..."     // Client user agent
}
```

### Storage Schema

```mermaid
graph TD
    subgraph "Durable Object Storage"
        KeyData["key:{uuid}"] --> FullKeyRecord[Complete API key record]
        
        LookupIndex["lookup:{api_key_value}"] --> KeyID[Maps key value to UUID]
        
        HMACStore["hmac:{api_key_value}"] --> Signature[HMAC signature]
        
        RotationStore["rotation:{uuid}"] --> RotationInfo[Rotation record]
        
        TimeIndex["keyindex:{timestamp}_{uuid}"] --> SortableIndex[Sortable key index]
        
        OwnerIndex["owner:{email}:{timestamp}_{uuid}"] --> OwnerList[Keys by owner]
        
        StatusIndex["status:{status}:{timestamp}_{uuid}"] --> StatusList[Keys by status]
    end
    
    subgraph "KV Storage"
        SystemFlag["system:setup_completed"] --> SetupFlag[Setup completion flag]
        
        AdminKeyStore["key:{uuid}"] --> AdminKeyData[Admin key data]
        
        AdminLookup["lookup:{admin_key}"] --> AdminID[Maps admin key to UUID]
        
        AdminIndex["index:admin:{uuid}"] --> AdminRecord[Admin record index]
        
        LogStore["log:admin:{log_id}"] --> LogEntry[Audit log entry]
        
        AdminLogIndex["log:admin:by_admin:{admin_id}:{timestamp}_{log_id}"] --> AdminLogs[Logs by admin]
        
        ActionLogIndex["log:admin:by_action:{action}:{timestamp}_{log_id}"] --> ActionLogs[Logs by action]
        
        CriticalLogIndex["log:admin:critical:{timestamp}_{log_id}"] --> CriticalLogs[Critical logs]
    end
    
    style KeyData fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style LookupIndex fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style HMACStore fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style RotationStore fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style SystemFlag fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style LogStore fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
```

The data is organized in Durable Object storage and KV using key patterns:

#### Durable Object Storage

- `key:{uuid}` - Stores the complete API key record
- `lookup:{api_key_value}` - Maps API key values to their UUIDs for fast validation
- `hmac:{api_key_value}` - Stores HMAC signatures for additional security
- `rotation:{uuid}` - Stores key rotation information
- `keyindex:{timestamp}_{uuid}` - Sortable index for efficient pagination

#### KV Storage

- `system:setup_completed` - Flag indicating if setup is complete
- `key:{uuid}` - Stores admin key data
- `lookup:{api_key_value}` - Maps admin keys to their UUIDs
- `index:admin:{uuid}` - Index of admin keys
- `log:admin:{log_id}` - Stores audit log entries
- `log:admin:by_admin:{admin_id}:{timestamp}_{log_id}` - Admin log index
- `log:admin:by_action:{action}:{timestamp}_{log_id}` - Action log index
- `log:admin:critical:{timestamp}_{log_id}` - Critical action log index

## Maintenance and Cleanup

```mermaid
sequenceDiagram
    participant DO as Durable Object
    participant Alarm as DO Alarm
    participant CleanupSvc as Cleanup Service
    participant Storage
    
    DO->>DO: Create and register alarms
    
    loop Regular maintenance cycle
        Alarm->>DO: Trigger alarm
        DO->>CleanupSvc: Run cleanup tasks
        
        CleanupSvc->>Storage: Find expired keys
        Storage-->>CleanupSvc: Return expired keys
        CleanupSvc->>Storage: Revoke expired keys
        
        CleanupSvc->>Storage: Find expired rotation records
        Storage-->>CleanupSvc: Return expired rotations
        CleanupSvc->>Storage: Clean up expired rotations
        
        CleanupSvc->>Storage: Find stale lookup entries
        Storage-->>CleanupSvc: Return stale entries
        CleanupSvc->>Storage: Remove stale entries
        
        CleanupSvc-->>DO: Return cleanup results
        DO->>DO: Schedule next alarm
    end
    
    alt Error during maintenance
        DO->>DO: Schedule shorter retry alarm
        DO->>DO: Log error
    end
```

The system uses Durable Object alarms for automatic maintenance:

### Cleanup Process

1. An alarm is set when the Durable Object is created
2. When the alarm fires, the system:
   - Identifies and revokes expired keys
   - Removes stale lookup entries
   - Cleans up expired rotation records
3. A new alarm is scheduled for the next cleanup cycle
4. In case of errors, a shorter alarm interval is used

## Scalability and Performance

```mermaid
graph TB
    subgraph "Request Processing Optimization"
        FastLookup[Fast Key Lookup]
        NonBlocking[Non-blocking Updates]
        PaginatedResults[Efficient Pagination]
        
        FastLookup -->|"O(1) validation"| Performance[Performance]
        NonBlocking -->|"Async tracking"| Performance
        PaginatedResults -->|"Cursor-based"| Performance
    end
    
    subgraph "Storage Optimization"
        Indexing[Optimized Indices]
        Compression[Data Compression]
        LazyLoading[Lazy Loading]
        
        Indexing -->|"Fast retrieval"| StoragePerf[Storage Performance]
        Compression -->|"Reduced size"| StoragePerf
        LazyLoading -->|"On-demand loading"| StoragePerf
    end
    
    subgraph "Scaling Characteristics"
        KeyCount[Large Key Count]
        WorkerInstances[Global Instances]
        DurableObjects[Multiple DOs]
        
        KeyCount --> ScalabilityChallenge[Scalability]
        WorkerInstances -->|"Edge distribution"| ScalabilitySolution[Scalability Solution]
        DurableObjects -->|"Strong consistency"| ScalabilitySolution
    end
    
    Performance --> OverallPerf[Overall Performance]
    StoragePerf --> OverallPerf
    ScalabilitySolution --> OverallPerf
```

The API Key Manager is designed for high scalability and performance:

1. **Efficient Lookup**: Fast key validation through a lookup index
2. **Cursor-based Pagination**: Efficient pagination for large datasets
3. **Non-blocking Updates**: Usage timestamps are updated non-blocking
4. **Transaction Support**: Atomic operations for data consistency
5. **Minimal Storage**: Only essential data is stored with reasonable limits
6. **Concurrent Safety**: All operations are safe under high concurrency
7. **Global Distribution**: Cloudflare's global network provides low-latency access

## Gateway Functionality

```mermaid
flowchart TB
    subgraph "Request Flow"
        Client[Client] -->|Request| Authentication
        Authentication -->|Authorized| Routing
        Routing -->|Match| ProxyOrDirect{Proxy or Direct?}
        ProxyOrDirect -->|Direct| Handler[Handler Function]
        ProxyOrDirect -->|Proxy| ProxyService[Proxy Service]
        ProxyService -->|Forward| CircuitBreaker
        CircuitBreaker -->|Check Status| CircuitOpen{Circuit Open?}
        CircuitOpen -->|Yes| ErrorResponse[Error Response]
        CircuitOpen -->|No| RetryLogic[Retry Logic]
        RetryLogic -->|Forward| BackendService[Backend Service]
        BackendService -->|Response| ResponseProcessing
        Handler -->|Process| ResponseProcessing[Response Processing]
        ResponseProcessing -->|Return| Client
    end
    
    subgraph "Gateway Configuration"
        Config[Configuration] -->|Load| ProxyRoutes[Proxy Routes]
        Config -->|Load| CircuitSettings[Circuit Breaker Settings]
        Config -->|Load| RetrySettings[Retry Settings]
        Config -->|Load| RateLimits[Rate Limits]
        
        ProxyRoutes --> Routing
        CircuitSettings --> CircuitBreaker
        RetrySettings --> RetryLogic
        RateLimits --> Authentication
    end
    
    style Client fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Authentication fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Routing fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style ProxyService fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style CircuitBreaker fill:#663333,stroke:#cc8888,stroke-width:2px,color:#ffffff
    style RetryLogic fill:#336633,stroke:#88cc88,stroke-width:2px,color:#ffffff
    style BackendService fill:#336666,stroke:#88cccc,stroke-width:2px,color:#ffffff
    style Config fill:#665533,stroke:#ccbb88,stroke-width:2px,color:#ffffff
```

The gateway functionality provides API proxying with advanced features:

1. **Enhanced Routing**: Pattern matching with path parameters and regex support
2. **Proxy Service**: Forwards requests to configured upstream services
3. **Path Rewriting**: Supports path transformations for backend compatibility
4. **Header Manipulation**: Adds, modifies, or removes headers for proxied requests
5. **Circuit Breaker**: Prevents cascading failures with three states (closed, open, half-open)
6. **Retry Logic**: Automatically retries failed requests with configurable backoff
7. **Versioning Support**: Handles API versioning through paths or headers
8. **Rate Limiting**: Prevents abuse with configurable rate limits

## Security Design

See [SECURITY.md](./SECURITY.md) for detailed security implementation information.

```mermaid
graph TB
    subgraph "Security Layers"
        Authentication[Authentication Layer]
        Authorization[Authorization Layer]
        Encryption[Encryption Layer]
        Integrity[Integrity Verification]
        Audit[Audit & Logging]
    end
    
    subgraph "Authentication Components"
        Authentication --> ApiKeys[API Key Validation]
        ApiKeys --> AdminKeys[Admin Key Management]
        ApiKeys --> ServiceKeys[Service Key Management]
    end
    
    subgraph "Authorization Components"
        Authorization --> RBAC[Role-Based Access Control]
        RBAC --> Roles[Role Definitions]
        RBAC --> Permissions[Permission Scopes]
        RBAC --> ScopeValidation[Scope Validation]
    end
    
    subgraph "Encryption Components"
        Encryption --> AtRest[Encryption at Rest]
        Encryption --> KeyEncryption[API Key Encryption]
        Encryption --> SecureRandom[Secure Key Generation]
    end
    
    subgraph "Integrity Components"
        Integrity --> HMAC[HMAC Signatures]
        Integrity --> Verification[Signature Verification]
    end
    
    subgraph "Audit Components"
        Audit --> AccessLog[Access Logging]
        Audit --> AdminLog[Admin Action Logging]
        Audit --> AlertSystem[Security Alerts]
    end
    
    style Authentication fill:#335566,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Authorization fill:#334466,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Encryption fill:#334455,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Integrity fill:#333366,stroke:#88aacc,stroke-width:2px,color:#ffffff
    style Audit fill:#336633,stroke:#88cc88,stroke-width:2px,color:#ffffff
```

Key security features:
- Role-based access control
- AES-GCM encryption for keys at rest
- HMAC signature verification
- Comprehensive audit logging
- API key rotation with grace periods
- Cryptographic material rotation
- Input validation and sanitization
- Rate limiting and IP validation