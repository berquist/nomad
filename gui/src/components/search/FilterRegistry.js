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
import { setToArray, DType, getSuggestions } from '../../utils'
import { searchQuantities } from '../../config'
import { Filter, getEnumOptions } from './Filter'
import elementData from '../../elementData'

// Containers for filter information
export const filterGroups = [] // Mapping from a group name -> set of filter names
export const filterData = {} // Stores data for each registered filter

// Ids for the filter menus: used to tie filter chips to a specific menu.
const idElements = 'elements'
const idStructure = 'structure'
const idMethod = 'method'
const idDFT = 'dft'
const idGW = 'gw'
const idBSE = 'bse'
const idProjection = 'projection'
const idDMFT = 'dmft'
const idPrecision = 'precision'
const idProperties = 'properties'
const idElectronic = 'electronic'
const idSolarCell = 'solarcell'
const idVibrational = 'vibrational'
const idMechanical = 'mechanical'
const idSpectroscopic = 'spectroscopic'
const idThermodynamic = 'thermodynamic'
const idGeometryOptimization = 'geometry_optimization'
const idELN = 'eln'
const idCustomQuantities = 'custom_quantities'
const idAuthor = 'author'
const idMetadata = 'metadata'
const idOptimade = 'optimade'

/**
 * This function is used to register a new filter within the SearchContext.
 * Filters are entities that can be searched through the filter panel and the
 * search bar, and can be encoded in the URL. Notice that a filter in this
 * context does not necessarily have to correspond to a quantity in the
 * metainfo, altought typically this is preferrable.
 *
 * Only registered filters may be searched for. The registration must happen
 * before any components use the filters. This is because:
 *  - The initial aggregation results must be fetched before any components
 *  using the filter values are rendered.
 *  - Several components need to know the list of available filters (e.g. the
 *  search bar and the search panel). If filters are only registered during
 *  component initialization, it may already be too late to update other
 *  components.
 *
 * @param {string} name Name of the filter.
 * @param {string} group The group into which the filter belongs to. Groups
 * are used to e.g. in showing FilterSummaries about a group of filters.
 * @param {obj} config Data object containing options for the filter.
 */
function saveFilter(name, group, config, parent) {
  if (group) {
    filterGroups[group]
      ? filterGroups[group].add(name)
      : filterGroups[group] = new Set([name])
  }
  const def = searchQuantities[name]
  const newConf = {...(config || {})}
  newConf.name = name
  const data = filterData[name] || new Filter(def, newConf, parent)
  filterData[name] = data
  return data
}

/**
 * Used to register a filter value for an individual metainfo quantity or
 * section.
 */
function registerFilter(name, group, config, subQuantities) {
  const parent = saveFilter(name, group, config)
  if (subQuantities) {
    for (const subConfig of subQuantities) {
      const subname = `${name}.${subConfig.name}`
      saveFilter(subname, group, subConfig, parent)
    }
  }
}

/**
 * Used to register a filter that is based on a subset of quantity values.
 */
function registerFilterOptions(name, group, target, label, description, options) {
  const keys = Object.keys(options)
  registerFilter(
    name,
    group,
    {
      aggs: {
        terms: {
          set: ((target) => (config) => ({quantity: target, include: keys, ...config}))(target),
          get: ((target) => (agg) => agg)(target)
        }
      },
      value: {
        set: (newQuery, oldQuery, value) => {
          const data = newQuery[target] || new Set()
          value.forEach((item) => { data.add(item) })
          newQuery[`${target}:all`] = data
        }
      },
      dtype: DType.Enum,
      multiple: true,
      repeats: true,
      exclusive: false,
      queryMode: 'all',
      options: options,
      label: label,
      description: description
    }
  )
}

const ptWidgetConfig = {
  type: 'periodictable',
  scale: '1/2',
  layout: {
    sm: {w: 12, h: 8, minW: 12, minH: 8},
    md: {w: 12, h: 8, minW: 12, minH: 8},
    lg: {w: 12, h: 8, minW: 12, minH: 8},
    xl: {w: 12, h: 8, minW: 12, minH: 8},
    xxl: {w: 12, h: 8, minW: 12, minH: 8}
  }
}

// Presets for different kind of quantities
const termQuantity = {aggs: {terms: {size: 5}}}
const termQuantityLarge = {aggs: {terms: {size: 10}}}
const termQuantityBool = {
  aggs: {terms: {size: 2, include: ['false', 'true']}},
  options: {
    false: {label: 'false'},
    true: {label: 'true'}
  }
}
const termQuantityNonExclusive = {aggs: {terms: {size: 5}}, exclusive: false}
const termQuantityAll = {aggs: {terms: {size: 5}}, exclusive: false, multiple: true, queryMode: 'all'}
const termQuantityAllNonExclusive = {...termQuantityNonExclusive, queryMode: 'all'}
const noAggQuantity = {}
const nestedQuantity = {}
const noQueryQuantity = {multiple: false, global: true}
const numberHistogramQuantity = {multiple: false, exclusive: false}

// Filters that directly correspond to a metainfo value
registerFilter(
  'results.material.structural_type',
  idStructure,
  {
    ...termQuantity,
    scale: '1/4',
    label: "Dimensionality",
    options: getEnumOptions('results.material.structural_type', ['not processed', 'unavailable'])
  }
)

registerFilter('results.material.functional_type', idStructure, termQuantityNonExclusive)
registerFilter('results.material.compound_type', idStructure, termQuantityNonExclusive)
registerFilter('results.material.material_name', idStructure, termQuantity)
registerFilter('results.material.chemical_formula_hill', idElements, {...termQuantity, placeholder: "E.g. H2O2, C2H5Br"})
registerFilter('results.material.chemical_formula_iupac', idElements, {...termQuantity, placeholder: "E.g. GaAs, SiC", label: 'Chemical Formula IUPAC'})
registerFilter('results.material.chemical_formula_reduced', idElements, {...termQuantity, placeholder: "E.g. H2NaO, ClNa"})
registerFilter('results.material.chemical_formula_anonymous', idElements, {...termQuantity, placeholder: "E.g. A2B, A3B2C2"})
registerFilter('results.material.n_elements', idElements, {...numberHistogramQuantity, label: 'Number of Elements'})
registerFilter('results.material.symmetry.bravais_lattice', idStructure, termQuantity)
registerFilter('results.material.symmetry.crystal_system', idStructure, termQuantity)
registerFilter(
  'results.material.symmetry.structure_name',
  idStructure,
  {
    ...termQuantity,
    options: getEnumOptions('results.material.symmetry.structure_name', ['not processed', 'cubic perovskite'])
  }
)
registerFilter('results.material.symmetry.strukturbericht_designation', idStructure, termQuantity)
registerFilter('results.material.symmetry.space_group_symbol', idStructure, {...termQuantity, placeholder: "E.g. Pnma, Fd-3m, P6_3mc"})
registerFilter('results.material.symmetry.point_group', idStructure, {...termQuantity, placeholder: "E.g. 6mm, m-3m, 6/mmm"})
registerFilter('results.material.symmetry.hall_symbol', idStructure, {...termQuantity, placeholder: "E.g. F 4d 2 3 -1d"})
registerFilter('results.material.symmetry.prototype_aflow_id', idStructure, {...termQuantity, placeholder: "E.g. A_cF8_227_a"})
registerFilter(
  'results.material.topology',
  idStructure,
  nestedQuantity,
  [
    {name: 'label', ...termQuantity},
    {name: 'method', ...termQuantity},
    {name: 'dimensionality', ...termQuantity},
    {name: 'building_block', ...termQuantity},
    {name: 'material_id', ...termQuantity},
    {name: 'symmetry.prototype_name', ...termQuantity},
    {name: 'symmetry.prototype_label_aflow', ...termQuantity},
    {name: 'n_atoms', ...numberHistogramQuantity},
    {name: 'atomic_fraction', ...numberHistogramQuantity},
    {name: 'mass_fraction', ...numberHistogramQuantity},
    {name: 'system_relation.type', ...termQuantity},
    {name: 'cell.a', ...numberHistogramQuantity},
    {name: 'cell.b', ...numberHistogramQuantity},
    {name: 'cell.c', ...numberHistogramQuantity},
    {name: 'cell.alpha', ...numberHistogramQuantity},
    {name: 'cell.beta', ...numberHistogramQuantity},
    {name: 'cell.gamma', ...numberHistogramQuantity},
    {name: 'cell.atomic_density', ...numberHistogramQuantity},
    {name: 'cell.mass_density', ...numberHistogramQuantity},
    {name: 'cell.volume', ...numberHistogramQuantity},
    {name: 'sbu_type', ...termQuantity},
    {name: 'largest_cavity_diameter', ...numberHistogramQuantity},
    {name: 'pore_limiting_diameter', ...numberHistogramQuantity},
    {name: 'largest_included_sphere_along_free_sphere_path', ...numberHistogramQuantity},
    {name: 'accessible_surface_area', ...numberHistogramQuantity},
    {name: 'accessible_volume', ...numberHistogramQuantity},
    {name: 'void_fraction', ...numberHistogramQuantity},
    {name: 'n_channels', ...numberHistogramQuantity},
    {name: 'sbu_coordination_number', ...numberHistogramQuantity}
  ]
)
registerFilter('results.method.method_name', idMethod, {...termQuantity, scale: '1/4'})
registerFilter('results.method.workflow_name', idMethod, {...termQuantity, scale: '1/4'})
registerFilter('results.method.simulation.program_name', idMethod, {...termQuantity, scale: '1/4'})
registerFilter('results.method.simulation.program_version', idMethod, termQuantity)
registerFilter('results.method.simulation.precision.native_tier', idPrecision, {...termQuantity, placeholder: "E.g. VASP - accurate", label: 'Code-specific Tier'})
registerFilter('results.method.simulation.precision.k_line_density', idPrecision, {...numberHistogramQuantity, scale: '1/2'})
registerFilter('results.method.simulation.precision.basis_set', idPrecision, {...termQuantity, scale: '1/4'})
registerFilter('results.method.simulation.precision.planewave_cutoff', idPrecision, {...numberHistogramQuantity, label: 'Plane-wave Cutoff', scale: '1/2'})
registerFilter('results.method.simulation.precision.apw_cutoff', idPrecision, {...numberHistogramQuantity, label: 'APW Cutoff', scale: '1/2'})
registerFilter('results.method.simulation.dft.core_electron_treatment', idDFT, termQuantity)
registerFilter('results.method.simulation.dft.jacobs_ladder', idDFT, {...termQuantity, scale: '1/2'})
registerFilter('results.method.simulation.dft.xc_functional_type', idDFT, {
  ...termQuantity,
  scale: '1/2',
  label: 'Jacob\'s ladder',
  options: {
    'LDA': {label: 'LDA'},
    'GGA': {label: 'GGA'},
    'meta-GGA': {label: 'Meta-GGA'},
    'hyper-GGA': {label: 'Hyper-GGA'},
    'hybrid': {label: 'Hybrid'}
  }
})
registerFilter('results.method.simulation.dft.xc_functional_names', idDFT, {...termQuantityNonExclusive, scale: '1/2', label: 'XC Functional Names'})
registerFilter('results.method.simulation.dft.exact_exchange_mixing_factor', idDFT, {...numberHistogramQuantity, scale: '1/2'})
registerFilter('results.method.simulation.dft.hubbard_kanamori_model.u_effective', idDFT, {...numberHistogramQuantity, scale: '1/2'})
registerFilter('results.method.simulation.dft.relativity_method', idDFT, termQuantity)
registerFilter('results.method.simulation.gw.type', idGW, {...termQuantity, label: 'GW Type'})
registerFilter('results.method.simulation.gw.starting_point_type', idGW, {
  ...termQuantity,
  scale: '1/2',
  options: {
    'LDA': {label: 'LDA'},
    'GGA': {label: 'GGA'},
    'meta-GGA': {label: 'Meta-GGA'},
    'hyper-GGA': {label: 'Hyper-GGA'},
    'hybrid': {label: 'Hybrid'},
    'HF': {label: 'HF'}
  }
})
registerFilter('results.method.simulation.gw.basis_set_type', idGW, {...termQuantity, scale: '1/4'})
registerFilter('results.method.simulation.bse.type', idBSE, termQuantity)
registerFilter('results.method.simulation.bse.solver', idBSE, termQuantity)
registerFilter('results.method.simulation.bse.starting_point_type', idBSE, {
  ...termQuantity,
  scale: '1/2',
  options: {
    'LDA': {label: 'LDA'},
    'GGA': {label: 'GGA'},
    'meta-GGA': {label: 'Meta-GGA'},
    'hyper-GGA': {label: 'Hyper-GGA'},
    'hybrid': {label: 'Hybrid'},
    'HF': {label: 'HF'}
  }
})
registerFilter('results.method.simulation.bse.basis_set_type', idBSE, {...termQuantity, scale: '1/4'})
registerFilter('results.method.simulation.bse.gw_type', idBSE, {...termQuantity, scale: '1/4', label: `GW Type`})
registerFilter('results.method.simulation.projection.type', idProjection, {...termQuantity, scale: '1/2'})
registerFilter('results.method.simulation.projection.localization_type', idProjection, {...termQuantity, scale: '1/2'})
registerFilter('results.method.simulation.dmft.impurity_solver_type', idDMFT, {...termQuantity})
registerFilter('results.method.simulation.dmft.total_filling', idDMFT, {...numberHistogramQuantity, scale: '1/2'})
registerFilter('results.method.simulation.dmft.magnetic_state', idDMFT, {...termQuantity})
registerFilter('results.method.simulation.dmft.inverse_temperature', idDMFT, {...numberHistogramQuantity, scale: '1/2'})
registerFilter('results.method.simulation.dmft.u', idDMFT, {...numberHistogramQuantity, scale: '1/2'})
registerFilter('results.method.simulation.dmft.jh', idDMFT, {...numberHistogramQuantity, label: `JH`, scale: '1/2'})
registerFilter('results.method.simulation.precision.k_line_density', idPrecision, {...termQuantity, label: 'k-line Density'})
registerFilter('results.eln.sections', idELN, termQuantity)
registerFilter('results.eln.tags', idELN, termQuantity)
registerFilter('results.eln.methods', idELN, termQuantity)
registerFilter('results.eln.instruments', idELN, termQuantity)
registerFilter('results.eln.lab_ids', idELN, termQuantity)
registerFilter('results.eln.names', idELN, noAggQuantity)
registerFilter('results.eln.descriptions', idELN, noAggQuantity)
registerFilter('external_db', idAuthor, {...termQuantity, label: 'External Database', scale: '1/4'})
registerFilter('authors.name', idAuthor, {...termQuantityNonExclusive, label: 'Author Name'})
registerFilter('upload_create_time', idAuthor, {...numberHistogramQuantity, scale: '1/2'})
registerFilter('datasets.dataset_name', idAuthor, {...termQuantityLarge, label: 'Dataset Name'})
registerFilter('datasets.doi', idAuthor, {...termQuantity, label: 'Dataset DOI'})
registerFilter('datasets.dataset_id', idAuthor, termQuantity)
registerFilter('domain', idMetadata, termQuantity)
registerFilter('entry_id', idMetadata, termQuantity)
registerFilter('entry_name', idMetadata, termQuantity)
registerFilter('mainfile', idMetadata, termQuantity)
registerFilter('upload_id', idMetadata, termQuantity)
registerFilter('published', idMetadata, termQuantity)
registerFilter('main_author.user_id', idMetadata, termQuantity)
registerFilter('quantities', idMetadata, {...noAggQuantity, label: 'Metainfo definition', queryMode: 'all'})
registerFilter('sections', idMetadata, {...noAggQuantity, label: 'Metainfo sections', queryMode: 'all'})
registerFilter('section_defs.definition_qualified_name', idMetadata, {...noAggQuantity, label: 'Section defs qualified name', queryMode: 'all'})
registerFilter('entry_type', idMetadata, {...noAggQuantity, label: 'Entry type', queryMode: 'all'})
registerFilter('entry_name.prefix', idMetadata, {...noAggQuantity, label: 'Entry name', queryMode: 'all'})
registerFilter('results.material.material_id', idMetadata, termQuantity)
registerFilter('optimade_filter', idOptimade, {multiple: true, queryMode: 'all'})
registerFilter('processed', idMetadata, {label: 'Processed', queryMode: 'all'})
registerFilter('custom_quantities', idCustomQuantities, {
  serializerExact: value => {
    const jsonStr = JSON.stringify(value)
    const result = encodeURIComponent(jsonStr)
    return result
  },
  serializerPretty: value => {
    if (!value) {
      return null
    }
    return `${value.and.length} condition${value.and.length > 0 ? 's' : ''}`
  },
  deserializer: value => {
    const jsonStr = decodeURIComponent(value)
    const result = JSON.parse(jsonStr)
    return result
  },
  multiple: false,
  value: {
    set: (newQuery, oldQuery, value) => {
      // TODO: We ignore the query here, it is later added to the final API query.
      // We had to do this hack, because there is not way to add a logical query
      // behind a prefix.
    }
  }
})
registerFilter(
  'results.properties.spectroscopic.spectra.provenance.eels',
  idSpectroscopic,
  {...nestedQuantity, label: 'Electron Energy Loss Spectrum (EELS)'},
  [
    {name: 'detector_type', ...termQuantity},
    {name: 'resolution', ...numberHistogramQuantity},
    {name: 'min_energy', ...numberHistogramQuantity},
    {name: 'max_energy', ...numberHistogramQuantity}
  ]
)
registerFilter(
  'results.properties.electronic.band_structure_electronic',
  idElectronic,
  {...nestedQuantity, label: 'Band Structure'},
  [
    {name: 'spin_polarized', label: 'Spin-polarized', ...termQuantityBool}
  ]
)
registerFilter(
  'results.properties.electronic.dos_electronic',
  idElectronic,
  {...nestedQuantity, label: 'Density of States (DOS)'},
  [
    {name: 'spin_polarized', label: 'Spin-polarized', ...termQuantityBool}
  ]
)
registerFilter(
  'results.properties.electronic.band_structure_electronic.band_gap',
  idElectronic,
  nestedQuantity,
  [
    {name: 'type', ...termQuantity},
    {name: 'value', ...numberHistogramQuantity, scale: '1/4'}
  ]
)
registerFilter(
  'results.properties.optoelectronic.solar_cell',
  idSolarCell,
  nestedQuantity,
  [
    {name: 'efficiency', ...numberHistogramQuantity, scale: '1/4'},
    {name: 'fill_factor', ...numberHistogramQuantity, scale: '1/4'},
    {name: 'open_circuit_voltage', ...numberHistogramQuantity, scale: '1/4'},
    {name: 'short_circuit_current_density', ...numberHistogramQuantity, scale: '1/4'},
    {name: 'illumination_intensity', ...numberHistogramQuantity, scale: '1/4'},
    {name: 'device_area', ...numberHistogramQuantity, scale: '1/4'},
    {name: 'device_architecture', ...termQuantity},
    {name: 'absorber_fabrication', ...termQuantity},
    {name: 'device_stack', ...termQuantityAllNonExclusive},
    {name: 'absorber', ...termQuantityAllNonExclusive},
    {name: 'electron_transport_layer', ...termQuantityAllNonExclusive},
    {name: 'hole_transport_layer', ...termQuantityAllNonExclusive},
    {name: 'substrate', ...termQuantityAllNonExclusive},
    {name: 'back_contact', ...termQuantityAllNonExclusive}
  ]
)
registerFilter(
  'results.properties.mechanical.bulk_modulus',
  idMechanical,
  nestedQuantity,
  [
    {name: 'type', ...termQuantity},
    {name: 'value', ...numberHistogramQuantity}
  ]
)
registerFilter(
  'results.properties.mechanical.shear_modulus',
  idMechanical,
  nestedQuantity,
  [
    {name: 'type', ...termQuantity},
    {name: 'value', ...numberHistogramQuantity}
  ]
)
registerFilter(
  'results.properties.available_properties',
  idProperties,
  termQuantityAll
)
registerFilter(
  'results.properties.mechanical.energy_volume_curve',
  idMechanical,
  nestedQuantity,
  [
    {name: 'type', ...termQuantity}
  ]
)
registerFilter(
  'results.properties.geometry_optimization',
  idGeometryOptimization,
  nestedQuantity,
  [
    {name: 'final_energy_difference', ...numberHistogramQuantity, scale: '1/8'},
    {name: 'final_displacement_maximum', ...numberHistogramQuantity, scale: '1/8'},
    {name: 'final_force_maximum', ...numberHistogramQuantity, scale: '1/8'}
  ]
)
registerFilter(
  'results.properties.thermodynamic.trajectory',
  idThermodynamic,
  nestedQuantity,
  [
    {name: 'available_properties', ...termQuantityAll},
    {name: 'provenance.molecular_dynamics.ensemble_type', ...termQuantity},
    {name: 'provenance.molecular_dynamics.time_step', ...numberHistogramQuantity}
  ]
)

// Visibility: controls the 'owner'-parameter in the API query, not part of the
// query itself.
registerFilter(
  'visibility',
  idMetadata,
  {
    ...noQueryQuantity,
    default: 'visible',
    description: 'The visibility of the entry.'
  }
)

// Combine: controls whether materials search combines data from several
// entries.
registerFilter(
  'combine',
  undefined,
  {
    ...noQueryQuantity,
    default: true,
    description: 'If selected, your filters may be matched from several entries that contain the same material. When unchecked, the material has to have a single entry that matches all your filters.'
  }
)

// Exclusive: controls the way elements search is done.
registerFilter(
  'exclusive',
  undefined,
  {
    ...noQueryQuantity,
    default: false,
    description: "Search for entries with compositions that only (exclusively) contain the selected atoms. The default is to return all entries that have at least (inclusively) the selected atoms."
  }
)

// In exclusive element query the elements names are sorted and concatenated
// into a single string.
registerFilter(
  'results.material.elements',
  idElements,
  {
    widget: ptWidgetConfig,
    aggs: {terms: {size: elementData.elements.length}},
    value: {
      set: (newQuery, oldQuery, value) => {
        if (oldQuery.exclusive) {
          if (value.size !== 0) {
            newQuery['results.material.elements_exclusive'] = setToArray(value).sort().join(' ')
          }
        } else {
          newQuery['results.material.elements'] = value
        }
      }
    },
    multiple: true,
    exclusive: false,
    queryMode: 'all'
  }
)

// Electronic properties: subset of results.properties.available_properties
registerFilterOptions(
  'electronic_properties',
  idElectronic,
  'results.properties.available_properties',
  'Electronic Properties',
  'The electronic properties that are present in an entry.',
  {
    'electronic.band_structure_electronic.band_gap': {label: 'Band gap'},
    band_structure_electronic: {label: 'Band structure'},
    dos_electronic: {label: 'Density of states'},
    greens_functions_electronic: {label: 'Green\u0027s functions'},
    eels: {label: 'Electron energy loss spectrum'}
  }
)

// Vibrational properties: subset of results.properties.available_properties
registerFilterOptions(
  'vibrational_properties',
  idVibrational,
  'results.properties.available_properties',
  'Vibrational Properties',
  'The vibrational properties that are present in an entry.',
  {
    dos_phonon: {label: 'Phonon density of states'},
    band_structure_phonon: {label: 'Phonon band structure'},
    energy_free_helmholtz: {label: 'Helmholtz free energy'},
    heat_capacity_constant_volume: {label: 'Heat capacity constant volume'}
  }
)

// Mechanical properties: subset of results.properties.available_properties
registerFilterOptions(
  'mechanical_properties',
  idMechanical,
  'results.properties.available_properties',
  'Mechanical Properties',
  'The mechanical properties that are present in an entry.',
  {
    bulk_modulus: {label: 'Bulk modulus'},
    shear_modulus: {label: 'Shear modulus'},
    energy_volume_curve: {label: 'Energy-volume curve'}
  }
)

// Spectroscopic properties: subset of results.properties.available_properties
registerFilterOptions(
  'spectroscopic_properties',
  idSpectroscopic,
  'results.properties.available_properties',
  'Spectroscopic Properties',
  'The spectroscopic properties that are present in an entry.',
  {
    eels: {label: 'Electron energy loss spectrum'}
  }
)

// Thermodynamical properties: subset of results.properties.available_properties
registerFilterOptions(
  'thermodynamic_properties',
  idThermodynamic,
  'results.properties.available_properties',
  'Thermodynamic Properties',
  'The thermodynamic properties that are present.',
  {
    trajectory: {label: 'Trajectory'}
  }
)

/**
 * Creates static suggestion for all metainfo quantities that have an enum
 * value. Also provides suggestions for quantity names.
 */
export const quantityNameSearch = 'quantity name'
export function getStaticSuggestions(quantities) {
  const suggestions = {}
  const filters = quantities
    ? [...quantities]
    : Object.keys(filterData)

  // Add suggestions from metainfo
  for (const quantity of filters) {
    const data = searchQuantities[quantity]
    const isEnum = data?.type?.type_kind === 'Enum'
    if (isEnum) {
      const options = data.type.type_data
      const maxLength = Math.max(...options.map(option => option.length))
      const minLength = maxLength <= 2 ? 1 : 2
      suggestions[quantity] = getSuggestions(
        options,
        minLength,
        quantity,
        (value) => `${quantity}=${value}`
      )
    }
  }

  // Add suggestions for quantity names
  if (quantities.has(quantityNameSearch)) {
    suggestions[quantityNameSearch] = getSuggestions(
      filters.filter(value => value !== quantityNameSearch && !filterData[value].section),
      2,
      quantityNameSearch
    )
  }
  return suggestions
}
