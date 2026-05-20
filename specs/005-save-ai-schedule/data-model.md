# Phase 1 Data Model: Save AI Focus Schedule

## Firestore Entity Schema

### Collection: `weekly_smart_schedules`

A weekly smart schedule represents the study alocation recommended by the AI for a specific user, study plan, and week.

#### Entity Definition (`WeeklySmartSchedule`)

```typescript
export interface WeeklySmartSchedule {
  id: string;             // Format: `${userId}_${planId}_${weekStart}`
  userId: string;         // Owner's user ID
  planId: string;         // Associated StudyPlanEdital ID
  weekStart: string;      // YYYY-MM-DD representing Monday of that week
  schedule: SmartScheduleItem[];
  generatedAt: string;    // ISO 8601 Timestamp of generation
  updatedAt: string;      // ISO 8601 Timestamp of last update
}

export interface SmartScheduleItem {
  day: string;            // e.g. "Segunda", "Terça", etc.
  totalHours: number;     // Sum of alocated hours
  subjects: {
    name: string;         // Subject name
    hours: number;        // Alocated hours
    reason: string;       // AI justification
  }[];
}
```

## Security Rules

We must update `firestore.rules` to secure the new collection. Only authenticated owners can read/write their documents.

```javascript
    // Cronograma de Foco Semanal Inteligente
    match /weekly_smart_schedules/{docId} {
      allow read: if request.auth != null
                  && resource.data.userId == request.auth.uid;
      
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.weekStart is string
                    && request.resource.data.schedule is list;

      allow update: if request.auth != null
                    && resource.data.userId == request.auth.uid
                    && request.resource.data.userId == resource.data.userId
                    && request.resource.data.weekStart == resource.data.weekStart
                    && request.resource.data.schedule is list;

      allow delete: if request.auth != null
                    && resource.data.userId == request.auth.uid;
    }
```
