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
import { isNil, isArray, isEmpty } from 'lodash'
import { searchQuantities } from '../../config'
import {
  getDatatype,
  getSerializer,
  getDeserializer,
  formatLabel,
  DType
} from '../../utils'
import { Unit } from '../../units'

/**
 * Filter is a wrapper for metainfo (quantity or section) that can be searched.
 * It contains information extracted from the metainfo together with additional
 * configuration that can e.g. be extracted from the NOMAD configuration file.
 */
export class Filter {
  options
  aggs
  value
  placeholder
  multiple
  exclusive
  unit
  dtype
  customSerialization
  serializerExact
  serializerPretty
  dimension
  deserializer
  label
  labelFull
  nested
  aggregatable
  section
  repeats
  widget
  parent
  schema
  description
  scale
  /**
  * @param {obj} def Metainfo definition. Optional as filters may not
  *   correspond to metainfo items.
  * @param {obj} params Contains configuration for the filter.
  *  - dtype: The data type for this filter. If no value is given and the
  *      name corresponds to a metainfo name the data type is read directly from
  *      the metainfo.
  *  - description: Description of the filter shown e.g. in the tooltips. If no
  *      value is given and the name corresponnds to a metainfo, the metainfo
  *      description is used.
  *  - unit: The unit for this filter. If no value is given and the name
  *      corresponds to a metainfo name the data type is read directly from the
  *      metainfo.
  *  - label: Short name displayed for this filter. If no value is given and the
  *      name corresponds to a metainfo name the description is read directly
  *      from the metainfo.
  *  - labelFull: Long name displayed for this filter.
  *  - placeholder: Placeholder displayed for this filter in input fields.
  *  - multiple: Whether the user can simultaneously provide multiple values for
  *      this filter.
  *  - exclusive: Whether this filter is exclusive: only one value is
  *      associated with a single entry.
  *  - queryMode: The default query mode (e.g. 'any', 'all) when multiple values
  *      can specified for this filter. Defaults to 'any'.
  *  - options: Object containing explicit options that this filter supports.
  *  - default: A default value which is implicitly enforced in the API call.
  *      This value will not be serialized in the search bar.
  *  - scale: The default scaling to perform for filter statistics.
  *  - value: Optional object containing a custom setter/getter for the filter value.
  *      Used when transforming the value from GUI to API and vice versa. E.g.
  *        value = {
  *          get: (value) => value
  *          set: (value) => value
  *        }
  *  - aggs: Object containing default values for specific aggregation types
  *      that may be requested for this filter.
  *      Also completely customized setter/getter methods are supported. E.g.
  *        aggs = {
  *          terms: {size: 5},
  *          histogram: {buckets: 20},
  *          min_max: {set: (config) => ({}), get: (agg) => ({})}
  *        }
  *  - nested: Provided for sections, determines whether they are configured as
  *      nested field types in ES.
  *  - repeats: Provided for sections, determines whether they can be repeated.
  *  - global: Whether this is a 'global' filter. Global filters can affect the
  *      behaviour of other filters without being serialized into the query
  *      itself. E.g. toggling the exclusive search for elements is a global
  *      filter that does not correspond to any metainfo and only affects how
  *      the element search is performed.
  *  - customSerialization:
  *  - serializerExact: Function that serializes the value of the filter in an exact way.
  *      Used to e.g. serialize the filter value for the URL.
  *  - serializerPretty: Function that serializes the value for displaying it in the GUI.
  *      May e.g. contain less decimals and not be serializable in the URL.
  *  - deserializer: Function that deserializes the value from the URL and from
  *      user input.
  *  - aggregatable: Indicates whether this filter can be used in term aggregations.
  *  - widget: Object that determines the default widget for this filter.
  *  - label: Name of the filter shown in the GUI. If no value is given and the
  *      name corresponds to a metainfo name the description is read directly
  *      from the metainfo.
  * @param {Filter} parent Optional parent filter
  */
  constructor(def, params, parent) {
    const name = params.name
    function getRepeats(def) {
      if (!isEmpty(def?.shape)) return true
      if (!isNil(def?.repeats)) {
        return def.repeats
      } else if (parent) {
        return getRepeats(parent)
      }
      return false
    }

    this.dtype = params?.dtype || getDatatype(def)
    this.description = params?.description || def?.description
    this.unit = params?.unit || def?.unit
    this.dimension = def?.unit && new Unit(def?.unit).dimension()
    this.label = params?.label || formatLabel(def?.name || name)
    let parentName
    if (parent) {
      const sections = name.split('.')
      const nSections = sections.length
      if (sections.length > 1) {
        parentName = formatLabel(sections[nSections - 2])
      }
    }
    this.labelFull = parentName ? `${parentName} ${this.label}` : this.label

    this.parent = parent
    this.schema = def?.schema
    this.placeholder = params?.placeholder
    this.multiple = params?.multiple === undefined ? true : params?.multiple
    this.exclusive = params?.exclusive === undefined ? true : params?.exclusive
    this.queryMode = params?.queryMode || (this.multiple ? 'any' : undefined)
    this.options = params?.options || getEnumOptions(def)
    this.default = params?.default
    this.scale = params?.scale || 'linear'
    this.value = params?.value
    this.aggs = params?.aggs
    this.nested = params?.nested === undefined ? false : params?.nested
    this.repeats = params?.repeats === undefined ? getRepeats(def) : params?.repeats
    this.global = params?.global === undefined ? false : params?.global
    this.section = !isNil(def?.nested)
    this.customSerialization = !!params?.serializerExact
    this.serializerExact = params?.serializerExact || getSerializer(this.dtype, false)
    this.serializerPretty = params?.serializerPretty || getSerializer(this.dtype, true)
    this.deserializer = params?.deserializer || getDeserializer(this.dtype, def?.dimension)
    this.aggregatable = def?.aggregatable === undefined ? false : def?.aggregatable
    this.widget = params?.widget || getWidgetConfig(this.dtype, def?.aggregatable)

    if (this.default && !this.global) {
      throw Error('Only filters that do not correspond to a metainfo value may have default values set.')
    }
    if (this.queryMode && !this.multiple) {
      throw Error('Only filters that accept multiple values may have a query mode.')
    }
  }
}

/**
 * Used to gather a list of fixed filter options from the metainfo.
 * @param {string} quantity Metainfo name
 * @returns Dictionary containing the available options and their labels.
 */
export function getEnumOptions(quantity, exclude = ['not processed']) {
  const metainfoOptions = searchQuantities?.[quantity]?.type?.type_data
  if (isArray(metainfoOptions) && metainfoOptions.length > 0) {
    const opt = {}
    for (const name of metainfoOptions) {
      opt[name] = {label: name}
    }
    exclude.forEach(value => delete opt[value])
    return opt
  }
}

/**
 * Tries to automatically create a default widget config for the given
 * quantity.
 *
 * @param {string} parent Parent quantity
 * @param {DType} dtype Datatype of the quantity
 * @param {bool} aggregatable Whether the quantity is aggregatable
 * @returns A widget config object.
 */
export const getWidgetConfig = (dtype, aggregatable) => {
  if (dtype === DType.Float || dtype === DType.Int || dtype === DType.Timestamp) {
    return histogramWidgetConfig
  } else if (aggregatable) {
    return termsWidgetConfig
  }
}

export const histogramWidgetConfig = {
  type: 'histogram',
  scale: 'linear',
  showinput: false,
  autorange: false,
  nbins: 30,
  layout: {
    sm: {w: 8, h: 3, minW: 8, minH: 3},
    md: {w: 8, h: 3, minW: 8, minH: 3},
    lg: {w: 8, h: 3, minW: 8, minH: 3},
    xl: {w: 8, h: 3, minW: 8, minH: 3},
    xxl: {w: 8, h: 3, minW: 8, minH: 3}
  }
}

export const termsWidgetConfig = {
  type: 'terms',
  scale: 'linear',
  showinput: false,
  layout: {
    sm: {w: 6, h: 9, minW: 6, minH: 9},
    md: {w: 6, h: 9, minW: 6, minH: 9},
    lg: {w: 6, h: 9, minW: 6, minH: 9},
    xl: {w: 6, h: 9, minW: 6, minH: 9},
    xxl: {w: 6, h: 9, minW: 6, minH: 9}
  }
}
