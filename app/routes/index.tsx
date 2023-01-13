import stylesUrl from '~/styles/index.css'
import type { ActionArgs, LinksFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { FieldsetConstraint } from '@conform-to/react'
import { conform, getFormElements, hasError, parse, shouldValidate, useFieldset, useForm } from '@conform-to/react'
import { Form, useActionData, useSubmit, useTransition } from '@remix-run/react'
import { captcha } from '~/lib/captcha.client'
import { useState } from 'react'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: stylesUrl }]
}

type FormType = { field1: string, field2?: string, answer: string }

const constraint: FieldsetConstraint<FormType> = {
  field1: { required: true },
  answer: { required: true },
}

async function validateField2(value?: string): Promise<string | undefined> {
  return new Promise((resolve) => setTimeout(() => {
    if (value === "ok") return resolve(undefined)
    resolve(`[SERVER rule] field2 can only be "ok" but was "${value}"`)
  }, 3_000))
}

export let action = async ({ request }: ActionArgs) => {
  const formData = await request.formData()
  const submission = parse<FormType>(formData)
  console.log('SERVER POST:', submission)
  switch (submission.type) {
    case 'submit':
    case 'validate': {
      if (shouldValidate(submission, 'field2')) {
        console.log('started validation of field2')
        const field2Err = await validateField2(submission.value.field2)
        console.log('finished validation of field2', field2Err)
        if (field2Err) submission.error.push(['field2', field2Err])
      }
      if (!submission.value.field1) {
        submission.error.push(['field1', 'field1 is SERVER required'])
      } else if (!submission.value.field1.endsWith('xxx')) {
        submission.error.push(['field1', `end with 'xxx' by SERVER`])
      }

      if (!submission.value.answer) {
        submission.error.push(['answer', 'Please select SERVER answer'])
      }
    }
  }
  // in case of submit always return a form level error, just for demonstration purpose
  if (submission.type === 'submit') {
    const fmtError: Array<[string, string]> = [['', 'Server OOOOOPS']]
    submission.error.push(...fmtError)
  }
  return json({ ...submission, value: submission.value })
}

export default function Index() {
  const state = useActionData<typeof action>()
  const submit = useSubmit()
  const transition = useTransition()
  const [phase, setPhase] = useState("")
  const [formHandlingInProgress, setFormHandlingInProgress] = useState(false)
  const form = useForm({
    mode: 'server-validation',
    initialReport: 'onBlur',
    state: state,
    async onSubmit(event, { submission, formData }) {
      // event.preventDefault()
      console.log("onSubmit, submission:", submission)
      setFormHandlingInProgress(true)
      setPhase("doing onSubmit...")
      try {
        if (submission.type === 'validate' && (submission.intent !== 'field2' || hasError(submission.error, 'field2'))) {
          event.preventDefault();
        }
        if (submission.type === 'submit') {
          event.preventDefault();
          const form = event.target as HTMLFormElement
          // perform extra slow captcha check so see the 'in progress' state
          setPhase("perform extra slow captcha check...")
          formData.set('captcha', await captcha(5_000))
          setPhase("submitting form data to server...")
          submit(formData, { method: 'post', action: form.getAttribute('action') ?? form.action })
        }
      } finally {
        setFormHandlingInProgress(false)
        setPhase("")
      }
    },
    onValidate({ form, formData }) {
      const submission = parse(formData)
      for (const element of getFormElements(form)) {
        switch (element.name) {
          case 'field1':
            if (element.validity.valueMissing) {
              submission.error.push([element.name, `${element.name} is required`])
            } else if (!element.value.endsWith('xxx')) {
              submission.error.push([element.name, `${element.name} should end with 'xxx'`])
            }
            break
          case 'answer':
            if (element.validity.valueMissing) {
              submission.error.push([element.name, `Please choose an answer`])
            }
        }
      }
      return submission
    },
  })
  const { field1, field2, answer } = useFieldset(form.ref, { ...form.config, constraint })

  return (
    <div>
      <p>hello</p>
      <p>phase: {phase}</p>
      <p>transition state: {transition.state} {transition.state === 'submitting' && <span>(action on server side extra slow...)</span>}</p>
      <Form method="post" {...form.props}>
        {form.error && <p className="field-error">{form.error}</p>}
        <label>
          <div>Field1</div>
          <input {...conform.input(field1.config)}/>
          <div className="field-error">{field1.error}</div>
        </label>
        <label>
          <div>slow Field2</div>
          <input {...conform.input(field2.config)}/>
          <div className="field-error">{field2.error}</div>
        </label>
        <label>
          <div>Answer</div>
          <input {...conform.input(answer.config, { type: 'radio', value: 'a' })}/> A
          <input {...conform.input(answer.config, { type: 'radio', value: 'b' })}/> B
          <div className="field-error">{answer.error}</div>
        </label>

        <button type="submit" disabled={formHandlingInProgress || transition.state === 'submitting'}>Post!</button>
      </Form>
    </div>
  )
}
