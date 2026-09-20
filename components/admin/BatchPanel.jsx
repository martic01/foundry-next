'use client';

import { useState, useTransition } from 'react';
import { removeFromBatch, setBlocked, setClassLink, sendBatchMessage } from '../../app/admin/actions';
import MessageFeed from '../dashboard/MessageFeed';
import ClassVideoManager from './ClassVideoManager';

export default function BatchPanel({ batch, students, classLinkUrl, videos = [] }) {
  const [linkInput, setLinkInput] = useState(classLinkUrl || '');
  const [messageInput, setMessageInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState('');

  function run(action, ...args) {
    startTransition(async () => {
      const res = await action(...args);
      setStatus(res?.error ? res.error : '');
    });
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display font-semibold text-ink">{batch.label}</p>
          <p className="text-xs text-inkdim">{students.length}/{batch.capacity} students</p>
        </div>
      </div>

      {/* Class link */}
      <div className="mb-5 rounded-lg border border-line bg-surfaceMuted p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Class link</p>
        <div className="flex gap-2">
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://meet.google.com/..."
            className="field flex-1"
          />
          <button
            onClick={() => run(setClassLink, batch.id, linkInput)}
            disabled={isPending || !linkInput}
            className="cta-btn whitespace-nowrap !px-4 !py-2 text-xs"
          >
            Save
          </button>
        </div>
      </div>

      {/* Class videos -- uploaded straight to Cloudinary from this
          browser (see lib/cloudinary.js), only the resulting URL is
          stored here. */}
      <div className="mb-5">
        <ClassVideoManager batchId={batch.id} videos={videos} />
      </div>

      {/* Students */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Students</p>
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {students.map((s) => (
            <div key={s.registrationId} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{s.fullName}</p>
                <p className="truncate text-xs text-inkdim">{s.email} · Age {s.age}</p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={() => run(setBlocked, s.profileId, !s.blocked)}
                  disabled={isPending}
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-inkdim hover:border-red-300 hover:text-red-600"
                >
                  {s.blocked ? 'Unblock' : 'Block'}
                </button>
                <button
                  onClick={() => run(removeFromBatch, s.registrationId)}
                  disabled={isPending}
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-inkdim hover:border-red-300 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!students.length && (
            <p className="p-3 text-sm text-inkdim">No students in this batch yet.</p>
          )}
        </div>
      </div>

      {/* Broadcast message composer -- only reachable from this admin
          page, and backed by the messages_admin_insert RLS policy either
          way, so a student session could never post here even if they
          somehow reached this code. */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-inkdim">Send an announcement</p>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Write a message to this batch\u2026"
            className="field flex-1"
          />
          <button
            onClick={() => {
              run(sendBatchMessage, batch.id, messageInput);
              setMessageInput('');
            }}
            disabled={isPending || !messageInput.trim()}
            className="cta-btn whitespace-nowrap !px-4 !py-2 text-xs"
          >
            Send
          </button>
        </div>
        <MessageFeed batchId={batch.id} />
      </div>

      {status && <p className="mt-3 text-sm text-red-600">{status}</p>}
    </div>
  );
}
