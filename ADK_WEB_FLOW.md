# ADK Web UI - Data and Control Flow

This document provides a high-level overview of the data and control flow within the `adk-web` Angular application, visualized using a Mermaid chart.

## Flowchart

The chart below illustrates how a user interaction (like sending a message) flows through the application, from the UI components to the backend services and back.

```mermaid
graph TD
    subgraph "User's Browser (Angular App)"
        A[User] -- "1. Types message & clicks send" --> B_ChatComponent;

        subgraph "UI Components"
            B_ChatComponent((ChatComponent));
            D_SidePanel[Side Panel Tabs <br/>(Events, State, Artifacts, etc.)];
            E_Messages[Message Display Area];
        end

        subgraph "Core Services"
            C_AgentService(AgentService);
            F_SessionService(SessionService);
            G_ArtifactService(ArtifactService);
            H_EvalService(EvalService);
        end
    end

    subgraph "Backend"
        I[ADK Python API Server];
    end

    %% Styling
    style B_ChatComponent fill:#8ab4f8,stroke:#333,stroke-width:2px,color:#000
    style I fill:#34a853,stroke:#333,stroke-width:2px,color:#000

    %% Connections
    A --> B_ChatComponent;
    B_ChatComponent -- "2. Calls AgentService.runSse()" --> C_AgentService;
    C_AgentService -- "3. Makes HTTP POST to /run_sse" --> I;
    I -- "4. Streams back response (SSE)" --> C_AgentService;
    C_AgentService -- "5. Processes stream & returns data" --> B_ChatComponent;
    B_ChatComponent -- "6. Updates message list" --> E_Messages;
    B_ChatComponent -- "7. Updates side panel data" --> D_SidePanel;

    D_SidePanel -- "Fetches data using" --> F_SessionService;
    D_SidePanel -- "Fetches data using" --> G_ArtifactService;
    D_SidePanel -- "Fetches data using" --> H_EvalService;

    F_SessionService -- "API Calls (e.g., /sessions)" --> I;
    G_ArtifactService -- "API Calls (e.g., /artifacts)" --> I;
    H_EvalService -- "API Calls (e.g., /run_eval)" --> I;

```

### Explanation of the Flow

1.  **User Interaction**: The flow starts when the user types a message in the `ChatComponent` and clicks send.
2.  **Component to Service**: The `ChatComponent` (the main UI controller) doesn't directly make HTTP requests. Instead, it calls a method on a dedicated service, in this case, `AgentService.runSse()`.
3.  **Service to Backend**: The `AgentService` is responsible for constructing the HTTP request and sending it to the **ADK API Server**.
4.  **Backend Response**: The API server processes the request and streams the response back using Server-Sent Events (SSE).
5.  **Service Processes Data**: The `AgentService` listens to the stream, processes the incoming chunks of data, and passes them back to the `ChatComponent` as they arrive.
6.  **UI Update**: The `ChatComponent` receives the new data (like a new bot message, a thought process, or a function call) and updates the `Message Display Area`.
7.  **Side Panel Update**: The `ChatComponent` also updates the data bound to the various side panel tabs, such as `EventTabComponent`, `StateTabComponent`, etc. These tabs then render the new information.
8.  **Side Panel Data Fetching**: The side panel tabs themselves use their own dedicated services (like `SessionService`, `ArtifactService`) to fetch their specific data from the backend, independent of the main chat flow.
