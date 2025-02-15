---
title: Workflows
---

## The built-in abstract workflow schema

Workflows are an important aspect of data as they explain how the data came to be. Let's
first clarify that *workflow* refers to a workflow that already happened and that has
produced *input* and *output* data that are *linked* through *tasks* that have been
performed . This often is also referred to as *data provenance* or *provenance graph*.

The following shows the overall abstract schema for *worklows* that can be found
in `nomad.datamodel.metainfo.workflow` (blue):

![workflow schema](workflow-schema.png)

The idea is that *workflows* are stored in a top-level archive section along-side other
sections that contain the *inputs* and *outputs*. This way the *workflow* or *provenance graph*
is just additional piece of the archive that describes how the data in this (or other archives) is connected.

Let'c consider an example *workflow*. Imagine a geometry optimization and ground state
calculation performed by two individual DFT code runs. The code runs are stored in
NOMAD entries `geom_opt.archive.yaml` and `ground_state.archive.yaml` using the `run`
top-level section.

### Example workflow

Here is a logical depiction of the workflow and all its tasks, inputs, and outputs.

![example workflow](example-workflow.png)

### Simple workflow entry

The following archive shows how to create such a workflow based on the given schema.
Here we only model the `GeometryOpt` and `GroundStateCalculation` as two tasks with
respective inputs and outputs that use references to entry archives of the respective
code runs.

```yaml
--8<-- "examples/docs/workflows/simple.archive.yaml"
```


### Nested workflows in one entry

Since a `Workflow` instance is also a `Tasks` instance due to inheritance, we can nest
workflows. Here we detailed the `GeometryOpt` as a *nested* workflow:

```yaml
--8<-- "examples/docs/workflows/nested.archive.yaml"
```

### Nested Workflows in multiple entries

Typically, we want to colocate our individual workflows with their inputs and outputs.
In the case of the geometry optimization, we might want to put this into the archive of
the geometry optimization code run. So the `geom_opt.archive.yaml` might contain its
own section `workflow2` that only contains the `GeometryOpt` workflow and uses local
references to its inputs and outputs:

```yaml
--8<-- "examples/docs/workflows/geom_opt.archive.yaml"
```

When we want to detail the complex workflow, we now need to refer to a nested workflow in
a different entry. This cannot be done directly, because `Workflow` instances can only contain `Task` instances and not reference them. Therefore, we added a `TaskReference` section definition that can be used to create proxy instances for tasks and workflows:

```yaml
--8<-- "examples/docs/workflows/composed.archive.yaml"
```

## Extending the workflow schema

The abstract workflow schema above allows us to build generalized tools for workflows,
like workflow searches, navigation in workflow, graphical representations of workflows, etc. But, you can still augment the given section definitions with more information through
inheritance. These information can be specialized references to denote inputs and outputs,
can be additional workflow or task parameters, and much more.

In this example, we created a special workflow section definition `GeometryOptimization`
that defines a parameter `threshold` and an additional reference to the final
calculation of the optimization:

```yaml
definitions:
{{ yaml_snippet('examples/docs/workflows/specialized.archive.yaml:definitions', '  ', '') }}
workflow2:
{{ yaml_snippet('examples/docs/workflows/specialized.archive.yaml:workflow2', '  ', 'inputs,outputs,tasks') }}inputs:
    ...
```
