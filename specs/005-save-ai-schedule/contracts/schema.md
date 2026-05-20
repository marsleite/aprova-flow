# Phase 1 Contracts: Save AI Focus Schedule

This contract defines the TypeScript interfaces and types for the weekly smart schedule.

## TypeScript Interfaces

These interfaces are used in both front-end components and Firestore library methods:

```typescript
export interface SmartScheduleSubject {
  name: string;
  hours: number;
  reason: string;
}

export interface SmartScheduleItem {
  day: string;
  totalHours: number;
  subjects: SmartScheduleSubject[];
}

export interface WeeklySmartSchedule {
  id?: string;
  userId: string;
  planId: string;
  weekStart: string; // YYYY-MM-DD representing Monday
  schedule: SmartScheduleItem[];
  generatedAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}
```

## API Payload Contract

No changes to the POST request/response payload of `/api/smart-schedule`. The frontend will directly use the response returned by this API to perform the save operation.
- **Request Payload**: `SmartScheduleRequest` (existing)
- **Response Payload**: `{ schedule: SmartScheduleItem[] }` (existing)
