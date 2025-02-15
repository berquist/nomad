/*
 * Copyright The NOMAD Authors.
 *
 * This file is part of NOMAD. See https://nomad-lab.eu for further info.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React, { useCallback, useState, useMemo, useRef } from 'react'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import PropTypes from 'prop-types'
import { useRecoilValue } from 'recoil'
import clsx from 'clsx'
import { CircularProgress, Tooltip, IconButton, TextField } from '@material-ui/core'
import Autocomplete from '@material-ui/lab/Autocomplete'
import CloseIcon from '@material-ui/icons/Close'
import { isNil } from 'lodash'
import { useSearchContext } from '../SearchContext'
import { guiState } from '../../GUIMenu'
import { useSuggestions } from '../../../hooks'
import { searchQuantities } from '../../../config'
import Placeholder from '../../visualization/Placeholder'

/*
 * Low-level representational component for all text fields used in the search.
 */
const useInputTextFieldStyles = makeStyles(theme => ({
  root: {
    height: '3rem'
  }
}))
export const InputTextField = React.memo((props) => {
  const initialLabel = useState(props.label)[0]
  const inputVariant = useRecoilValue(guiState('inputVariant'))
  const inputSize = useRecoilValue(guiState('inputSize'))
  const styles = useInputTextFieldStyles({classes: props.classes})

  return props.loading
    ? <Placeholder className={clsx(props.className, styles.root)} />
    : <TextField size={inputSize} variant={inputVariant} {...props} hiddenLabel={!initialLabel}/>
})

InputTextField.propTypes = {
  label: PropTypes.string,
  loading: PropTypes.bool,
  className: PropTypes.string,
  classes: PropTypes.object
}

/*
 * Generic text field component that should be used for most user inputs.
 * Defines default behaviour for user input such as clearing inputs when
 * pressing esc and submitting values when pressing enter. Can also display
 * customizable list of suggestions.
 */
const useInputTextStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },
  listbox: {
      boxSizing: 'border-box',
      '& ul': {
        padding: 0,
        margin: 0
      }
    }
}))
export const InputText = React.memo(({
  value,
  error,
  shrink,
  suggestions,
  loading,
  onChange,
  onAccept,
  onSelect,
  onBlur,
  onError,
  getOptionLabel,
  groupBy,
  renderOption,
  renderGroup,
  ListboxComponent,
  filterOptions,
  className,
  classes,
  TextFieldProps,
  InputProps,
  PaperComponent
}) => {
  const theme = useTheme()
  const styles = useInputTextStyles({classes: classes, theme: theme})
  const [open, setOpen] = useState(false)
  const disabled = TextFieldProps?.disabled
  // The highlighted item is stored in a ref to keep the component more
  // responsive during browsing the suggestions
  const highlightRef = useRef(null)

  // Clears the input value and closes suggestions list
  const clearInputValue = useCallback(() => {
    onError && onError(undefined)
    onChange && onChange("")
    setOpen(false)
  }, [onChange, onError])

  // Handle item highlighting: items can he highlighted with mouse or keyboard.
  const handleHighlight = useCallback((event, value, reason) => {
    highlightRef.current = value
  }, [highlightRef])

  // Handle blur
  const handleBlur = useCallback(() => {
    onBlur && onBlur()
    onAccept && onAccept(value)
  }, [onBlur, onAccept, value])

  // Handles special key presses
  const handleKeyDown = useCallback((event) => {
    // When escape is pressed, close the menu if it is visible and showing some
    // items. Otherwise clear the current text input.
    if (event.key === 'Escape') {
      if (open && suggestions?.length > 0) {
        setOpen(false)
      } else {
        clearInputValue()
      }
      event.stopPropagation()
      event.preventDefault()
    }
    // When enter is pressed, select currently highlighted value and close menu,
    // or if menu is not open submit the value.
    if (event.key === 'Enter') {
      if (open && highlightRef.current) {
        onSelect && onSelect(getOptionLabel(highlightRef.current).trim())
      } else {
        onAccept && onAccept(value && value.trim())
      }
      event.stopPropagation()
      event.preventDefault()
      setOpen(false)
    }
  }, [open, suggestions, onSelect, onAccept, value, getOptionLabel, clearInputValue, highlightRef])

  // Handle input events. Errors are cleaned in input change, regular typing
  // emits onChange, selection with mouse emits onSelect.
  const handleInputChange = useCallback((event, value, reason) => {
    onError && onError(undefined)
    if (event) {
      if (reason === 'reset') {
        onSelect && onSelect(value)
      } else {
        onChange && onChange(value)
      }
    }
  }, [onChange, onSelect, onError])

  return <div className={clsx(className, styles.root)}>
    <Autocomplete
      freeSolo
      disabled={disabled}
      clearOnBlur={false}
      inputValue={value || ''}
      value={null}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onBlur={handleBlur}
      fullWidth
      disableClearable
      classes={{listbox: styles.listbox}}
      ListboxComponent={ListboxComponent}
      PaperComponent={PaperComponent}
      options={suggestions}
      onInputChange={handleInputChange}
      onHighlightChange={handleHighlight}
      getOptionLabel={getOptionLabel}
      getOptionSelected={(option, value) => false}
      groupBy={groupBy}
      renderGroup={renderGroup}
      filterOptions={filterOptions}
      renderOption={renderOption}
      renderInput={(params) => {
        // We need to strip out the styling of the input field that is imposed
        // by Autocomplete. Otherwise the styles enabled by the
        // hiddenLabel-property will be overridden.
        params.InputProps.className = undefined
        return <InputTextField
          {...params}
          size="small"
          helperText={error || undefined}
          error={!!error}
          onKeyDown={handleKeyDown}
          InputLabelProps={{shrink}}
          InputProps={{
            ...params.InputProps,
            endAdornment: (<>
              {loading ? <CircularProgress color="inherit" size={20} /> : null}
              {(value?.length || null) && <>
                <Tooltip title="Clear">
                  <IconButton
                    size="small"
                    onClick={clearInputValue}
                    className={styles.iconButton}
                    aria-label="clear"
                  >
                    <CloseIcon/>
                  </IconButton>
                </Tooltip>
              </>}
            </>),
            ...InputProps
          }}
          {...TextFieldProps}
        />
      }}
    />
  </div>
})

InputText.propTypes = {
  value: PropTypes.string,
  error: PropTypes.string, // Error shown underneath the text
  shrink: PropTypes.bool, // Whether the label should automatically "shrink" on input
  suggestions: PropTypes.array, // Array of suggested values
  loading: PropTypes.bool, // Whether loading icon should be shown
  onChange: PropTypes.func, // Triggered whenever the input text changes
  onSelect: PropTypes.func, // Triggered when an option is selected from suggestions
  onAccept: PropTypes.func, // Triggered when value should be accepted
  onBlur: PropTypes.func, // Triggered when text goes out of focus
  onError: PropTypes.func, // Triggered when any errors should be cleared
  getOptionLabel: PropTypes.func,
  groupBy: PropTypes.func,
  renderOption: PropTypes.func,
  renderGroup: PropTypes.func,
  ListboxComponent: PropTypes.any,
  PaperComponent: PropTypes.any,
  TextFieldProps: PropTypes.object,
  InputProps: PropTypes.object,
  filterOptions: PropTypes.func,
  className: PropTypes.string,
  classes: PropTypes.object
}

InputText.defaultProps = {
  getOptionLabel: (option) => option.value
}

/*
 * Text field that can be used to submit filter values that target a specific
 * quantity. Can also suggest values.
 */
const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
    boxSizing: 'border-box'
  }
}))
export const InputTextQuantity = React.memo(({
  quantity,
  suggestions,
  loading,
  onChange,
  disableSuggestions,
  className,
  classes,
  ...TextFieldProps
}) => {
  const theme = useTheme()
  const { filterData, useSetFilter } = useSearchContext()
  const styles = useStyles({classes: classes, theme: theme})
  const [inputValue, setInputValue] = useState('')
  const [suggestionInput, setSuggestionInput] = useState('')
  const [highlighted, setHighlighted] = useState({value: ''})
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const [quantitiesSuggestion, quantitiesAll] = useMemo(() => [
    [{name: quantity, size: 5}],
    new Set([quantity])
  ], [quantity])
  const [suggestionsAuto, loadingAuto] = useSuggestions(quantitiesSuggestion, quantitiesAll, suggestionInput)
  const finalSuggestions = suggestions || suggestionsAuto
  const finalLoading = loading || loadingAuto
  const disableSuggestionsFinal = suggestions
    ? true
    : isNil(disableSuggestions)
      ? !searchQuantities[quantity]?.suggestion
      : disableSuggestions

  // Attach the filter hook
  const setFilter = useSetFilter(quantity)
  const disabled = TextFieldProps.disabled

  // Sets the input value and calls the callback if given
  const handleChange = useCallback((input) => {
    setInputValue(input)
    onChange && onChange(input)
  }, [onChange])

  // Clears the input and suggestions
  const clearInputValue = useCallback(() => {
    handleChange('')
    setSuggestionInput('')
    setOpen(false)
  }, [handleChange])

  // Triggered when a value is submitted by pressing enter or clicking the
  // search icon.
  const handleSubmit = useCallback((value) => {
    if (value.trim().length === 0) {
      return
    }
    const valid = true
    if (valid) {
      // Submit to search context on successful validation.
      setFilter(old => {
        const multiple = filterData[quantity].multiple
        return (isNil(old) || !multiple) ? new Set([value]) : new Set([...old, value])
      })
      clearInputValue()
    } else {
      setError(`Invalid query`)
    }
  }, [filterData, quantity, setFilter, clearInputValue])

  const handleHighlight = useCallback((event, value, reason) => {
    setHighlighted(value)
  }, [])

  // Handles special key presses
  const handleKeyDown = useCallback((event) => {
    // When escape is pressed, close the menu if it is visible and showing some
    // items. Otherwise clear the current text input.
    if (event.key === 'Escape') {
      if (open && suggestions?.length > 0) {
        setOpen(false)
      } else {
        clearInputValue()
      }
      event.stopPropagation()
      event.preventDefault()
    }
    // When enter is pressed, select currently highlighted value and close menu,
    // or if menu is not open submit the value.
    if (event.key === 'Enter') {
      if (open && highlighted?.value) {
        handleSubmit(highlighted.value)
      } else {
        handleSubmit(inputValue)
      }
      event.stopPropagation()
      event.preventDefault()
    }
  }, [open, suggestions, highlighted, handleSubmit, inputValue, clearInputValue])

  // Handle typing events.
  const handleInputChange = useCallback((event, value, reason) => {
    setError(error => error ? undefined : null)

    // When an option is selected (mouse or keyboard), the filter is immediately
    // submitted and the field value cleared.
    if (reason === 'reset') {
      handleSubmit(value)
    } else {
      handleChange(value)
    }

    // Suggestions are only retrieved on user input, or when the value has been
    // cleared (this clears the suggestions)
    if (!disableSuggestionsFinal && (value.trim() === '' || reason === 'input')) {
      setSuggestionInput(value)
    }
  }, [disableSuggestionsFinal, handleSubmit, handleChange])

  return <div className={clsx(className, styles.root)}>
    <Autocomplete
      freeSolo
      disabled={disabled}
      clearOnBlur={false}
      inputValue={inputValue}
      value={null}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      fullWidth
      disableClearable
      classes={{endAdornment: styles.endAdornment}}
      options={finalSuggestions}
      onInputChange={handleInputChange}
      onHighlightChange={handleHighlight}
      getOptionLabel={option => option.value}
      getOptionSelected={(option, value) => false}
      renderInput={(params) => {
        // We need to strip out the styling of the input field that is imposed
        // by Autocomplete. Otherwise the styles enabled by the
        // hiddenLabel-property will be overridden.
        params.InputProps.className = undefined
        return <InputTextField
          {...params}
          size="small"
          placeholder="Type here"
          label={error || undefined}
          error={!!error}
          onKeyDown={handleKeyDown}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (<>
              {finalLoading ? <CircularProgress color="inherit" size={20} /> : null}
              {(inputValue?.length || null) && <>
                <Tooltip title="Clear">
                  <IconButton
                    size="small"
                    onClick={clearInputValue}
                    className={styles.iconButton}
                    aria-label="clear"
                  >
                    <CloseIcon/>
                  </IconButton>
                </Tooltip>
              </>}
            </>)
          }}
          {...TextFieldProps}
        />
      }}
    />
  </div>
})

InputTextQuantity.propTypes = {
  /*
   * The quantity targeted by the text field target.
   */
  quantity: PropTypes.string,
  /*
   * A manual array of suggestions.
   */
  suggestions: PropTypes.array,
  /*
   * Whether suggestions are being loaded.
   */
  loading: PropTypes.bool,
  /*
   * Callback for when the input changes.
   */
  onChange: PropTypes.bool,
  /*
   * Whether to enable or disable automatic suggestions. Will be forcefully set
   * to true if manual list of suggestions are provided. If no value is given
   * the suggestions are turned on if they are available for the quantity.
   */
  disableSuggestions: PropTypes.bool,
  className: PropTypes.string,
  classes: PropTypes.object
}
