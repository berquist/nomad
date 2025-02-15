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
import React, { useCallback } from 'react'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import { isNil, isPlainObject, isEmpty } from 'lodash'
import { FilterChip, FilterChipGroup, FilterAnd, FilterOr } from './FilterChip'
import { useSearchContext } from './SearchContext'
import { useUnits } from '../../units'
import { DType } from '../../utils'

/**
 * Displays a summary for the given subset of filters. Each filter value is
 * displayed as a chip.
 */
const typesWithLabel = new Set([DType.Boolean, DType.Int, DType.Float])
const useStyles = makeStyles(theme => {
  const paddingVertical = theme.spacing(1)
  const paddingHorizontal = theme.spacing(1.5)
  return {
    root: {
      boxShadow: 'inset 0 0 8px 1px rgba(0,0,0, 0.06)',
      backgroundColor: theme.palette.background.default,
      width: '100%',
      paddingRight: paddingHorizontal,
      paddingLeft: paddingHorizontal,
      paddingTop: paddingVertical,
      paddingBottom: paddingVertical,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center'
    },
    chip: {
      padding: theme.spacing(0.5)
    }
  }
})
const FilterSummary = React.memo(({
  quantities,
  className,
  classes
}) => {
  const { filterData, filterAbbreviations, useFiltersState } = useSearchContext()
  const [filters, setFilter] = useFiltersState(quantities)
  // TODO: locked filters are currently not shown to keep the layout tidier
  const filtersLocked = {} // useFiltersLockedState(quantities)
  const theme = useTheme()
  const units = useUnits()
  const styles = useStyles({classes: classes, theme: theme})

  // Creates a set of chips for a quantity
  const createChips = useCallback((name, label, filterValue, onDelete, locked) => {
    const newChips = []
    if (isNil(filterValue)) {
      return
    }
    // If query has multiple elements, we display a chip for each. For
    // numerical values we also display the quantity name.
    const {metaType, serializerPretty, customSerialization} = filterData[name]
    const serializer = serializerPretty
    const isArray = filterValue instanceof Array
    const isSet = filterValue instanceof Set
    const isObj = isPlainObject(filterValue)
    let op = null
    if (locked) {
      op = <FilterAnd/>
    } else if (filterData[name].queryMode === "any") {
      op = <FilterOr/>
    } else if (filterData[name].queryMode === "all") {
      op = <FilterAnd/>
    }
    if (customSerialization) {
      const item = <FilterChip
        locked={locked}
        quantity={name}
        label={serializer(filterValue)}
        onDelete={() => {
          onDelete(undefined)
        }}
      />
      newChips.push({comp: item, op})
    } else if (isArray || isSet) {
      filterValue.forEach((value, index) => {
        const displayValue = serializer(value, units)
        const item = <FilterChip
          locked={locked}
          quantity={name}
          label={typesWithLabel.has(metaType) ? `${label} = ${displayValue}` : displayValue}
          onDelete={() => {
            let newValue
            if (isSet) {
              newValue = new Set(filterValue)
              newValue.delete(value)
            } else if (isArray) {
              newValue = [...filterValue]
              newValue.splice(index, 1)
            }
            onDelete(newValue)
          }}
        />
        newChips.push({comp: item, op})
      })
    } else if (isObj) {
      // Range queries
      const lte = serializer(filterValue.lte, units)
      const gte = serializer(filterValue.gte, units)
      const lt = serializer(filterValue.lt, units)
      const gt = serializer(filterValue.gt, units)
      if (!isNil(gte) || !isNil(gt) || !isNil(lte) || !isNil(lt)) {
        let content
        if ((!isNil(gte) || !isNil(gt)) && (isNil(lte) && isNil(lt))) {
          content = `${label}${!isNil(gte) ? ` >= ${gte}` : ''}${!isNil(gt) ? ` > ${gt}` : ''}`
        } else if ((!isNil(lte) || !isNil(lt)) && (isNil(gte) && isNil(gt))) {
          content = `${label}${!isNil(lte) ? ` <= ${lte}` : ''}${!isNil(lt) ? ` < ${lt}` : ''}`
        } else {
          content = `${!isNil(gte) ? `${gte} <= ` : ''}${!isNil(gt) ? `${gt} < ` : ''}${label}${!isNil(lte) ? ` <= ${lte}` : ''}${!isNil(lt) ? ` < ${lt}` : ''}`
        }
        const item = <FilterChip
          locked={locked}
          quantity={name}
          label={content}
          onDelete={() => {
            onDelete(undefined)
          }}
        />
        newChips.push({comp: item, op})
      }
    } else {
      const item = <FilterChip
        locked={locked}
        quantity={name}
        label={`${label}=${serializer(filterValue)}`}
        onDelete={() => {
          onDelete(undefined)
        }}
      />
      newChips.push({comp: item, op})
    }
    return newChips.map((chip, index) => (
      <React.Fragment key={`${name}${index}`}>
        {chip.comp}{index !== newChips.length - 1 && chip.op}
      </React.Fragment>
    ))
  }, [filterData, units])

  // Create chips for all of the requested quantities
  const chips = []
  for (const quantity of quantities || []) {
    const filterValue = filters[quantity]
    const filterLockedValue = filtersLocked[quantity]
    if (isNil(filterValue) && isNil(filterLockedValue)) {
      continue
    }
    // Nested filters
    const isSection = filterData[quantity].section
    let newChips = []
    if (isSection) {
      function addChipsForSection(data, locked) {
        if (isNil(data)) return
        const entries = Object.entries(data)
        entries.forEach(([key, value], index) => {
          const onDelete = (newValue) => {
            const newSection = {...data}
            if (newValue === undefined) {
              delete newSection[key]
            } else {
              newSection[key] = newValue
            }
            setFilter([quantity, newSection])
          }
          newChips = newChips.concat(createChips(`${quantity}.${key}`, key, value, onDelete, locked))
          if (index !== entries.length - 1) {
            newChips.push(<FilterAnd key={`${quantity}-and`}/>)
          }
        })
      }
      addChipsForSection(filterLockedValue, true)
      if (!isEmpty(filterValue) && !isEmpty(filterLockedValue)) {
        newChips.push(<FilterAnd key={`${quantity}-locked-and`}/>)
      }
      addChipsForSection(filterValue, false)
    // Regular non-nested filters
    } else {
      const onDelete = (newValue) => setFilter([quantity, newValue])
      const label = filterAbbreviations[quantity]
      if (!isNil(filterLockedValue)) {
        newChips = newChips.concat(createChips(quantity, label, filterLockedValue, onDelete, true))
        if (!isNil(filterValue)) {
          newChips.push(<FilterAnd key={`${quantity}-locked-and`}/>)
        }
      }
      newChips = newChips.concat(createChips(quantity, label, filterValue, onDelete, false))
    }

    // Place the chips in a group
    if (newChips.length > 0) {
      const group = <FilterChipGroup
        key={quantity}
        quantity={quantity}
      >{newChips}
      </FilterChipGroup>
      chips.push(group)
    }
  }

  return chips.length !== 0 && <div className={clsx(className, styles.root)}>
    {chips}
  </div>
})

FilterSummary.propTypes = {
  quantities: PropTypes.object, // Set of searchQuantities for which the filters are displayed
  className: PropTypes.string,
  classes: PropTypes.object
}

export default FilterSummary
