# Form Data Persistence Fix

## Problem
When users navigated backwards in the scouting forms (pit scouting and normal scouting), all previously entered data would disappear. This was a critical UX issue that made the forms frustrating to use.

## Root Cause
The form components (MatchDetailsForm, AutonomousForm, TeleopForm, EndgameForm, MiscellaneousForm) each maintained their own internal state. When navigating backwards:
1. React would unmount the current form component
2. The previous form component would remount
3. The remounted component would initialize with fresh empty state
4. The parent component stored the data but didn't pass it back to child components

## Solution
Modified all form components to accept and use initial data props:

### 1. Updated Form Component Props
Added `initialData` prop to all form components:
- **MatchDetailsForm**: Added `initialData` prop with matchData, teamNumber, allianceColor, alliancePosition
- **AutonomousForm**: Added `initialData` prop with Partial<ScoringNotes>
- **TeleopForm**: Added `initialData` prop with Partial<ScoringNotes>
- **EndgameForm**: Added `initialData` prop with Partial<ScoringNotes>
- **MiscellaneousForm**: Added `initialData` prop with defense_rating and comments

### 2. State Initialization
Modified each component to initialize state with initialData:
```typescript
const [formData, setFormData] = useState({
  auto_leave: (initialData?.auto_leave as boolean) || false,
  auto_coral_trough: (initialData?.auto_coral_trough as number) || 0,
  // ... other fields
});
```

### 3. Added useEffect for State Synchronization
Added useEffect hooks to sync initialData with state when props change:
```typescript
useEffect(() => {
  if (initialData) {
    setFormData({
      auto_leave: (initialData.auto_leave as boolean) || false,
      // ... update all fields
    });
  }
}, [initialData]);
```

### 4. Updated Parent Components
Modified parent components (scout.tsx and mobile-scout.tsx) to pass form data to child components:
```typescript
<AutonomousForm
  onNext={(data) => {
    setFormData(prev => ({ ...prev, autonomous: data }));
    handleStepNext('teleop');
  }}
  onBack={() => setCurrentStep('match-details')}
  currentStep={currentStepIndex}
  totalSteps={steps.length}
  initialData={formData.autonomous}  // ← Pass existing data
/>
```

## Files Modified

### Form Components
- `components/scout/MatchDetailsForm.tsx`
- `components/scout/AutonomousForm.tsx`
- `components/scout/TeleopForm.tsx`
- `components/scout/EndgameForm.tsx`
- `components/scout/MiscellaneousForm.tsx`

### Parent Components
- `pages/scout.tsx`
- `pages/mobile-scout.tsx`

## Testing
To verify the fix works:
1. Navigate to `/scout` or `/mobile-scout`
2. Fill out Match Details form and click Next
3. Fill out Autonomous form and click Next
4. Click Back to return to Autonomous form
5. **Expected**: All previously entered data should be visible
6. Click Back again to return to Match Details
7. **Expected**: All previously entered data should be visible
8. Repeat for all form steps

## Pit Scouting
The pit scouting forms (`pit-scouting.tsx` and `pit-scouting-mobile.tsx`) already had proper data persistence because they store all form data in the parent component's state and bind form fields directly to that state. No changes were needed for these forms.

## Benefits
- ✅ Users can navigate backwards without losing data
- ✅ Better user experience
- ✅ Reduces frustration and data re-entry
- ✅ Maintains form state across navigation
- ✅ Works on both desktop and mobile versions

## Database Integration
No database changes were required. The fix only affects client-side form state management. Data is still saved to Supabase when the user clicks Submit.

