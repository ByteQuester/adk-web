# ADK-Web Learning Path: From Zero to Feature-Ready

This document outlines a series of incremental steps to help you understand the `adk-web` Angular codebase. Each step is designed to build your confidence and knowledge, preparing you to implement larger features like authentication, new pages, and payments.

---

## Phase 1: The Basics - Visuals and Simple Interactions

**Goal:** Get comfortable with the project structure, finding files, and making simple visual changes.

### 1. Change Static Text

*   **What to do:** Modify the "Session ID" label in the chat toolbar to "Conversation ID".
*   **Where to look:** `src/app/components/chat/chat.component.html`
*   **What you'll learn:** How to locate and edit basic HTML content within a component's template.

### 2. Change a Style

*   **What to do:** Change the background color of the blue message bubbles sent by the user.
*   **Where to look:** `src/app/components/chat/chat.component.scss` (Look for the `.user-message .message-card` CSS rule).
*   **What you'll learn:** How component-specific styles (SCSS) are applied and how to modify them.

### 3. Add a New UI Element & Action

*   **What to do:** Add a new "info" icon button next to the "delete" icon in the chat toolbar. When clicked, it should print a message to the browser's developer console.
*   **Where to look:**
    1.  `src/app/components/chat/chat.component.html`: Add a new `<span class="material-symbols-outlined">info</span>` button.
    2.  `src/app/components/chat/chat.component.ts`: Add a new method like `onInfoClick() { console.log("Info button clicked!"); }` and bind it to the new button's `(click)` event in the HTML.
*   **What you'll learn:** How to connect an action in the HTML template to a function in the component's TypeScript file (event binding).

---

## Phase 2: Understanding Data Flow

**Goal:** Understand how data is passed from the TypeScript code to the HTML template and how services provide that data.

### 4. Display More Data in the Template

*   **What to do:** For each bot message in the chat, display its unique `eventId` just below the message text.
*   **Where to look:** `src/app/components/chat/chat.component.html`. Inside the `*ngFor` loop that iterates through `messages`, you can access `message.eventId` and display it.
*   **What you'll learn:** How data from the component's TypeScript (`message` object) is bound and displayed in the HTML template.

### 5. Create a "Dummy" Service

*   **What to do:** Create a new `LoggingService` that has a single method, `log(message: string)`. Call this new service from the `ChatComponent` every time a message is sent.
*   **Where to look:**
    1.  Run `ng generate service core/services/logging` in your terminal to create the service file.
    2.  `src/app/core/services/logging.service.ts`: Add the `log` method.
    3.  `src/app/components/chat/chat.component.ts`: Inject the new service in the constructor (`private loggingService: LoggingService`) and call `this.loggingService.log(...)` inside the `sendMessage` method.
*   **What you'll learn:** The foundation of Angular's architecture: creating services and using Dependency Injection to make them available in components.

### 6. Fetch External Data with a Service

*   **What to do:** Modify your new `LoggingService` to make an HTTP GET request to a public API like `https://jsonplaceholder.typicode.com/todos/1` and log the result.
*   **Where to look:** `src/app/core/services/logging.service.ts`. You will need to inject Angular's `HttpClient` into your service's constructor and use it to make the `get` request.
*   **What you'll learn:** How services are used to manage all external communication, keeping components clean and focused on the UI.

---

## Phase 3: Expanding the Application with Routing

**Goal:** Learn how to add new pages and navigate between them, a critical step for your goal.

### 7. Create a New "About" Page

*   **What to do:** Create a completely new page at the `/about` URL that displays some static text. Add a link to it from the main UI.
*   **Where to look:**
    1.  Run `ng generate component components/about` in your terminal.
    2.  `src/app/app-routing.module.ts`: Add a new route object: `{ path: 'about', component: AboutComponent }`.
    3.  `src/app/components/chat/chat.component.html`: Add a link `<a routerLink="/about">About</a>` somewhere in the side drawer to navigate to your new page.
*   **What you'll learn:** How to create new components and wire them up to URLs using Angular's router.

### 8. Pass Data to a Route

*   **What to do:** Change the link to `/about?version=1.0`. In the `AboutComponent`, read the `version` parameter from the URL and display it on the page.
*   **Where to look:** `src/app/components/about/about.component.ts`. Inject the `ActivatedRoute` service into the constructor and use it in `ngOnInit` to access the query parameters.
*   **What you'll learn:** How to pass data between pages using URL parameters.

---

## Phase 4: Preparing for Authentication

**Goal:** Implement the basic UI patterns required for handling a logged-in vs. logged-out state.

### 9. Simulate Login/Logout

*   **What to do:** Add a "Login" button to the UI. When clicked, it should toggle a simple boolean property (e.g., `isLoggedIn`) in the component and change its own text to "Logout", and vice-versa.
*   **Where to look:** `src/app/components/chat/chat.component.ts` and `src/app/components/chat/chat.component.html`.
*   **What you'll learn:** Managing simple state within a component.

### 10. Conditionally Show/Hide Elements

*   **What to do:** Use the `isLoggedIn` property from the previous step to only show the chat input box if the user is "logged in".
*   **Where to look:** `src/app/components/chat/chat.component.html`. You will wrap the chat input form with an `<div *ngIf="isLoggedIn">...</div>`.
*   **What you'll learn:** How to use the `*ngIf` structural directive to dynamically change the UI based on application state—a core concept for building dynamic apps.
