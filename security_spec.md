# Security Specification - bookings

## Data Invariants
- A booking must always have `clientName`, `clientPhone`, `service`, `date`, `time`, `status`, and `createdAt`.
- `status` must be one of `pending`, `confirmed`, `cancelled`.
- `createdAt` must be the server time of creation.
- Only authenticated admins can read all bookings or update statuses.
- Guests can create bookings but cannot read or update them (except through admin actions).

## The Dirty Dozen Payloads

1. **Malicious Creation (Status Hijack)**: Creating a booking already marked as `confirmed`.
2. **Identity Spoofing**: Creating a booking with a fake `createdAt` time.
3. **Admin Privilege Escalation**: Updating a booking status as a guest.
4. **Data Injection**: Adding a 1MB string to the `clientName` field.
5. **Collection Scanning**: Trying to list all bookings without being an admin.
6. **State Shortcutting**: Skipping from `pending` to `cancelled` without a valid reason (though permitted by admins).
7. **Resource Poisoning**: Using a document ID with junk characters.
8. **PII Leak**: Reading a booking document to get a phone number as a random user.
9. **Update Hijack**: Changing a `service` type after the booking is made.
10. **Shadow Update**: Adding a field like `isVip: true` to a booking.
11. **Time Travel**: Setting `updatedAt` to a future date.
12. **Orphaned Write**: Creating a booking for a service that doesn't exist (if I had a services collection).

## Rules Logic

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default Deny
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function incoming() {
      return request.resource.data;
    }

    function existing() {
      return resource.data;
    }

    function isValidBooking(data) {
      return data.clientName is string && data.clientName.size() <= 100 &&
             data.clientPhone is string && data.clientPhone.size() <= 20 &&
             data.service is string && data.service.size() <= 100 &&
             data.date is string && data.date.size() <= 20 &&
             data.time is string && data.time.size() <= 20 &&
             data.status in ['pending', 'confirmed', 'cancelled'] &&
             data.keys().hasAll(['clientName', 'clientPhone', 'service', 'date', 'time', 'status', 'createdAt']) &&
             data.keys().size() == 7 || (data.keys().size() == 8 && data.keys().hasAll(['telegramMessageId']));
    }

    match /bookings/{bookingId} {
      allow create: if isValidId(bookingId) && 
                      isValidBooking(incoming()) && 
                      incoming().status == 'pending' &&
                      incoming().createdAt == request.time;
      
      allow read: if isAdmin();
      
      allow update: if isAdmin() && 
                      isValidBooking(incoming()) &&
                      incoming().createdAt == existing().createdAt &&
                      (
                        // Action: Confirmation
                        (incoming().status == 'confirmed' && incoming().diff(existing()).affectedKeys().hasOnly(['status'])) ||
                        // Action: Cancellation
                        (incoming().status == 'cancelled' && incoming().diff(existing()).affectedKeys().hasOnly(['status']))
                      );
    }
  }
}
```
