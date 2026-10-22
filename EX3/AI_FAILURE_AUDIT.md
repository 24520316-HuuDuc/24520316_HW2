# AI Failure Audit Report

## Project
HW3: High-Concurrency Flash-Sale E-Commerce Engine

## Failure 1: TypeScript Constructor Parameter Property

### Problem
An AI-generated implementation used a parameter property
inside the constructor:

`constructor(initialStock: number, private readonly reservationDurationMs = 30000)`

The TypeScript configuration enabled `erasableSyntaxOnly`,
which caused a compilation error.

### Detection
The VS Code editor highlighted the constructor parameter,
and TypeScript reported a compilation problem.

### Fix
Declare `reservationDurationMs` as a class property and
assign its value explicitly inside the constructor.

### Prevention
Run the TypeScript production build after modifying class
properties or constructor declarations.

## Failure 2: Reservation Expiration Was Not Reflected in Snapshots

### Problem
An earlier implementation of `getSnapshot()` did not
expire reservations before calculating available stock.

The interface could therefore display outdated inventory
after a reservation deadline had passed.

### Detection
Review the inventory state transitions and test the
inventory snapshot at the exact expiration timestamp.

### Fix
Call `expireReservations(now)` before returning the
inventory snapshot. Restore stock only when an active
reservation transitions to the expired state.

### Prevention
Add boundary tests immediately before and at the
reservation expiration timestamp.

## Failure 3: Cancellation Did Not Check Expiration First

### Problem
An earlier implementation of `cancelReservation()` did
not check whether the reservation had already expired.

A late cancellation could incorrectly mark an expired
reservation as cancelled instead of expired.

### Detection
Review the state transition rules and test cancellation
after the reservation deadline.

### Fix
Process expired reservations before attempting cancellation.
Only active reservations can be cancelled, and stock must
be restored exactly once.

### Prevention
Test cancellation before expiration, at expiration, and
after expiration. Verify that repeated operations cannot
restore stock more than once.

## Conclusion

The audit identified issues involving TypeScript
compatibility and inventory state transitions.

The implementation was revised to use explicit class
properties, process expiration before inventory operations,
and restrict cancellation and payment to valid states.

Further automated tests and production-build checks are
required before considering the assignment complete.