"use strict";

class InMemoryNoteStore {
  constructor(initialNotes = []) {
    this.notes = new Map(initialNotes.map((note) => [note.id, { ...note }]));
  }

  list() {
    return [...this.notes.values()].map((note) => ({ ...note }));
  }

  save(note) {
    this.notes.set(note.id, { ...note });
    return { ...note };
  }
}

module.exports = { InMemoryNoteStore };
