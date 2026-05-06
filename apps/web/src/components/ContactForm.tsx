'use client';

import { useState } from 'react';
import { submitContactForm } from '@/lib/resort-api';
import { cn } from '@/lib/utils';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [feedback, setFeedback] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    const res = await submitContactForm({ name: name.trim(), email: email.trim(), phone: phone.trim(), message: message.trim() });
    setStatus('done');
    setFeedback(res.message);
    if (res.ok) {
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Name</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-cream px-4 py-3 outline-none ring-forest-500 focus:ring-2"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-cream px-4 py-3 outline-none ring-forest-500 focus:ring-2"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Phone</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-cream px-4 py-3 outline-none ring-forest-500 focus:ring-2"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Message</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-cream px-4 py-3 outline-none ring-forest-500 focus:ring-2"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="mt-6 w-full rounded-full bg-forest-700 py-3.5 font-semibold text-white shadow-md hover:bg-forest-800 disabled:opacity-60"
      >
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>
      {feedback && (
        <p className={cn('mt-3 text-center text-sm', status === 'done' ? 'text-forest-800' : 'text-red-700')}>
          {feedback}
        </p>
      )}
    </form>
  );
}
