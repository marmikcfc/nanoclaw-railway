import { describe, it, expect } from 'vitest'

// We test the pure helper functions exported from task-router
import { buildPrompt, selectTask } from '../../../src/task-router.js'

describe('buildPrompt', () => {
  it('includes task title and recent messages', () => {
    const prompt = buildPrompt('any update?', 'telegram', [
      {
        id: 'abc-123',
        title: 'Fix login bug',
        summary: 'Looking at JWT',
        channel: 'telegram',
        recent_messages: [
          { role: 'user', text: 'check the login', ts: '2026-03-30T10:00:00Z' },
          { role: 'agent', text: 'Found JWT issue', ts: '2026-03-30T10:01:00Z' },
        ],
      },
    ])

    expect(prompt).toContain('Fix login bug')
    expect(prompt).toContain('check the login')
    expect(prompt).toContain('Found JWT issue')
    expect(prompt).toContain('any update?')
    expect(prompt).toContain('Looking at JWT')
  })

  it('handles tasks with no recent messages', () => {
    const prompt = buildPrompt('hello', 'telegram', [
      { id: 'abc-123', title: 'Empty task', summary: null, channel: 'telegram', recent_messages: [] },
    ])
    expect(prompt).toContain('Empty task')
    expect(prompt).toContain('hello')
  })
})

describe('selectTask', () => {
  const tasks = [
    {
      id: 'task-uuid-1',
      title: 'Fix login',
      summary: null,
      channel: 'telegram',
      recent_messages: [],
    },
    {
      id: 'task-uuid-2',
      title: 'Write email',
      summary: null,
      channel: 'telegram',
      recent_messages: [],
    },
  ]

  it('returns attach when action=attach, confidence>=0.65, and task_id is valid', () => {
    const result = selectTask(
      { action: 'attach', task_id: 'task-uuid-1', confidence: 0.9, reasoning: 'clearly continuing' },
      tasks,
    )
    expect(result).toEqual({ action: 'attach', taskId: 'task-uuid-1', reasoning: 'clearly continuing' })
  })

  it('downgrades to new when confidence < 0.65', () => {
    const result = selectTask(
      { action: 'attach', task_id: 'task-uuid-1', confidence: 0.5, reasoning: 'maybe' },
      tasks,
    )
    expect(result).toEqual({ action: 'new', taskId: null, reasoning: 'maybe' })
  })

  it('returns new when task_id not in open tasks', () => {
    const result = selectTask(
      { action: 'attach', task_id: 'unknown-uuid', confidence: 0.9, reasoning: 'hallucinated' },
      tasks,
    )
    expect(result).toEqual({ action: 'new', taskId: null, reasoning: 'hallucinated' })
  })

  it('returns misc when action=misc', () => {
    const result = selectTask(
      { action: 'misc', task_id: undefined, confidence: 1, reasoning: 'greeting' },
      tasks,
    )
    expect(result).toEqual({ action: 'misc', taskId: null, reasoning: 'greeting' })
  })

  it('returns new when action=new', () => {
    const result = selectTask(
      { action: 'new', task_id: undefined, confidence: 1, reasoning: 'new request' },
      tasks,
    )
    expect(result).toEqual({ action: 'new', taskId: null, reasoning: 'new request' })
  })
})
