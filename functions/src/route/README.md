# Route Handlers

Each handler is a function that takes its dependencies and returns an Express
middleware to handle the route.

This makes dependency management of each route explicit and simple.

```typescript
app.post('/new', newEvent(eventRepo));
```

