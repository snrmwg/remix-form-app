import stylesUrl from '~/styles/index.css'
import type { ActionArgs, LinksFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { FieldsetConstraint} from '@conform-to/react';
import { conform, getFormElements, parse, useFieldset, useForm } from '@conform-to/react'
import { Form, useActionData } from '@remix-run/react'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: stylesUrl }]
}

type FormType = {field1: string, answer: string}
const constraint: FieldsetConstraint<FormType> = {
  field1: {required: true},
  answer: {required: true}
}

export let action = async ({ request }: ActionArgs) => {
  const formData = await request.formData()
  const submission = parse<FormType>(formData)
  console.log('SERVER POST:', submission)
  switch (submission.type) {
    case 'submit':
    case 'validate': {
      if (!submission.value.field1) {
        submission.error.push(['field1', 'field1 is SERVER required']);
      } else if (!submission.value.field1.endsWith('xxx')) {
        submission.error.push(['field1', `end with 'xxx' by SERVER`])
      }

      if (!submission.value.answer) {
        submission.error.push(['answer', 'Please select SERVER answer']);
      }
    }
  }
  // TODO
  const fmtError: Array<[string, string]> = [['', 'Server OOOOOPS']]
  submission.error.push(...fmtError)
  return json({... submission, value: submission.value})
}

export default function Index() {
  const state = useActionData<typeof action>()
  const form = useForm({
  //  mode: 'server-validation',
    initialReport: 'onBlur',
    state: state,
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
    }
  })
  const { field1, answer } = useFieldset(form.ref, {... form.config, constraint})

  return (
    <div>
      <p>hello</p>
      <Form method="post" {...form.props}>
        {form.error && <p className="field-error">{form.error}</p>}
        <label>
          <div>Field1</div>
          <input {...conform.input(field1.config)}/>
          <div className="field-error">{field1.error}</div>
        </label>
        <label>
          <div>Answer</div>
          <input {...conform.input(answer.config, {type: 'radio', value: 'a'})}/> A
          <input {...conform.input(answer.config,{type: 'radio', value: 'b'})}/> B
          <div className="field-error">{answer.error}</div>
        </label>

        <button type="submit">Post!</button>
      </Form>
    </div>
  )
}
