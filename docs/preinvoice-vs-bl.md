# Pre-Invoice vs Bill of Lading (BL)

This project separates information collection between the pre-invoice delivery note workflow and the final Bill of Lading (BL) document.

Key points:
- Pre-invoice Delivery Note creation focuses on job order linkage, client reference, vehicle snapshot, parts and labor selections, and document identifiers.
- Delivery address and contact information are NOT requested or displayed during pre-invoice creation; these details are captured exclusively in the BL document.

Implementation details:
- UI: Removed delivery address and contact inputs from `src/components/DeliveryNoteForm.tsx` and batch generation in `src/components/DeliveryNotesList.tsx`.
- Validation: Updated `src/stores/deliveryNoteStore.ts` to drop address/contact requirements in `validateDocument` and removed contact type checks in `updateDeliveryNoteValidated`.
- Types: Made `deliveryAddress` and `deliveryContact` optional in `src/types/deliveryNote.ts` (both `DeliveryNote` and `DeliveryNoteFormData`).
- BL Logic: Adjusted `src/services/deliveryNoteBL.js` validation to reflect that address/contact are optional at pre-invoice stage.

Testing:
- Added tests to confirm delivery notes can be created without address/contact and remain valid within the pre-invoice flow.

Rationale:
- Aligns with business requirement to streamline pre-invoice processing while ensuring legal delivery information is preserved within the BL document for transport and liability.
