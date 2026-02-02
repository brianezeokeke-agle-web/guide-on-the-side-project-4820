/**
 * This file contains business logic for tutorial operations.
 * Routes should delegate here instead of mutating data directly.
 *
 * TODO (Draft Save Ticket):
 * - Add function to update a tutorial draft
 * - Ensure updatedAt is refreshed
 * - Preserve immutable fields (id, createdAt)
 * - Support the autosave-style overwrite
 */

function updateTutorialDraft(existingTutorial, updatedData) {
  // TODO: merge updatedData into existingTutorial
  // TODO: validate minimal structure
  // TODO: update timestamp
  return null;
}

module.exports = {
  updateTutorialDraft,
};
