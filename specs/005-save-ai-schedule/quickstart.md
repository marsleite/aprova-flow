# Phase 1 Quickstart: Save AI Focus Schedule

This guide outlines how to run, verify, and test the AI smart schedule persistence feature.

## Development & Execution

1. **Start the local backend & frontend**:
   Use standard dev command:
   ```bash
   npm run dev
   ```

2. **Verify Firestore Rules**:
   Ensure you run Firestore Emulator or target correct project to test the rules added in `firestore.rules`.
   Test command:
   ```bash
   npm test
   ```

## Verification Scenarios

### Scenario A: First-time Generation
1. Access the Dashboard (`/dashboard`).
2. Verify the "Cronograma de Foco" card is empty and displays the "Gerar" button.
3. Click "Gerar".
4. The loader runs, calls `/api/smart-schedule`, succeeds, renders the schedule, and silently saves it to Firestore.
5. Reload the page (F5).
6. Verify the dashboard loads the previously generated schedule instantly without needing to click "Gerar".

### Scenario B: Plan switching
1. Go to settings or the planner page and switch the active plan (Edital).
2. Go back to `/dashboard`.
3. Verify that either a different schedule saved for that plan is loaded, or the "Gerar" button is displayed if no schedule has been generated for this plan yet.

### Scenario C: Recalculation
1. Click "Recalcular".
2. The system makes a new AI request, receives a new recommendation, updates the UI, and automatically updates the existing Firestore document.
3. Reload the page (F5).
4. Verify the new recalculated schedule remains loaded.
