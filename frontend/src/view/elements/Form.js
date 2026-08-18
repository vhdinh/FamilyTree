import './Form.css'

export default function Form({datum, rel_datum, store, rel_type, card_edit, postSubmit, card_display, edit: {el, open, close}}) {
  setupFromHtml();
  open();

  function setupFromHtml() {
    const is_delete_visible = !(datum.to_add || !!rel_datum)

    el.innerHTML = (`
      <div class="modal-content member-form">
        <div class="member-form-header">
          <h2 class="member-form-title">${rel_datum ? 'Add family member' : 'Edit family member'}</h2>
          <div class="member-form-header-actions">
            <button type="button" class="member-form-icon-btn member-form-delete" title="Delete" aria-label="Delete" style="display: ${is_delete_visible ? 'flex' : 'none'}">
              ${trashIcon()}
            </button>
            <button type="button" class="member-form-icon-btn member-form-close" title="Close" aria-label="Close">
              ${closeIcon()}
            </button>
          </div>
        </div>
        <form class="member-form-body">
          <div class="gender-toggle">
            <label class="gender-option gender-option-m">
              <input type="radio" name="gender" value="M" ${datum.data.gender === 'M' ? 'checked' : ''}>
              <span><i class="gender-dot"></i>Male</span>
            </label>
            <label class="gender-option gender-option-f">
              <input type="radio" name="gender" value="F" ${datum.data.gender === 'F' ? 'checked' : ''}>
              <span><i class="gender-dot"></i>Female</span>
            </label>
          </div>
          <div class="form-fields">
            ${getEditFields(card_edit)}
          </div>
          ${(rel_type === "son" || rel_type === "daughter") ? otherParentSelect() : ''}
          <button type="submit" class="member-form-submit">Save changes</button>
        </form>
      </div>
    `)
    el.querySelector("form").addEventListener('submit', submitFormChanges)
    el.querySelector(".member-form-delete").addEventListener('click', handleDeleteClick)
    el.querySelector(".member-form-close").addEventListener('click', () => close())
  }

  let delete_armed = false, delete_timeout = null

  function handleDeleteClick(e) {
    const btn = e.currentTarget
    if (!delete_armed) {
      e.preventDefault()
      e.stopPropagation()
      armDelete(btn)
    } else {
      disarmDelete(btn)
      deletePerson()
    }
  }

  function armDelete(btn) {
    delete_armed = true
    btn.classList.add('confirm-armed')
    btn.innerHTML = `${trashIcon()}<span>Confirm delete</span>`
    delete_timeout = setTimeout(() => disarmDelete(btn), 4000)
    document.addEventListener('click', handleOutsideClick, true)
  }

  function disarmDelete(btn) {
    delete_armed = false
    clearTimeout(delete_timeout)
    document.removeEventListener('click', handleOutsideClick, true)
    if (btn) {
      btn.classList.remove('confirm-armed')
      btn.innerHTML = trashIcon()
    }
  }

  function handleOutsideClick(e) {
    const btn = el.querySelector(".member-form-delete")
    if (btn && !btn.contains(e.target)) disarmDelete(btn)
  }

  function trashIcon() {
    return (`
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M6.5 7l.75 12.15A2 2 0 0 0 9.24 21h5.52a2 2 0 0 0 1.99-1.85L17.5 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    `)
  }

  function closeIcon() {
    return (`
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `)
  }

  function otherParentSelect() {
    const data_stash = store.getData();
    return (`
      <div class="form-field">
        <label>Select other parent</label>
        <select name="other_parent">
          ${(!rel_datum.rels.spouses || rel_datum.rels.spouses.length === 0)
              ? ''
              : rel_datum.rels.spouses.map((sp_id, i) => {
                  const spouse = data_stash.find(d => d.id === sp_id)
                  return (`<option value="${sp_id}" ${i === 0 ? 'selected' : ''}>${card_display[0](spouse)}</option>`)
                }).join("\n")}
          <option value="${'_new'}">NEW</option>
        </select>
      </div>
    `)
  }

  function submitFormChanges(e) {
    e.preventDefault()
    const form_data = new FormData(e.target)
    form_data.forEach((v, k) => datum.data[k] = v)
    close()
    postSubmit()
  }

  function deletePerson() {
    close()
    // TODO: remove person
    postSubmit({delete: true})
  }

  function getEditFields(card_edit) {
    return card_edit.map(d => {
      const label = d.placeholder.charAt(0).toUpperCase() + d.placeholder.slice(1)
      return (`
        <div class="form-field">
          <label>${label}</label>
          ${d.type === 'text'
            ? `<input type="text" name="${d.key}" placeholder="${label}" value="${datum.data[d.key] || ''}">`
            : d.type === 'textarea'
            ? `<textarea name="${d.key}" placeholder="${label}">${datum.data[d.key] || ''}</textarea>`
            : ''}
        </div>
      `)
    }).join('\n')
  }
}
