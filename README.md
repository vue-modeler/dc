# Dependency container for VUE

The container is based on the affect scope API and stores the instance while it is in use. Under the hood, it works roughly like a shared composable.

- Type Safe
- Extremely light
- Extremely simple API
- Instance can be any data type
- Complies with the principle of single responsibility

## For what 

In modern applications (PWA, SPA), it becomes necessary to share one instance of something in different places: between components on the same page, between pages, between different representations of the component (mobile and PC).

The container simplifies this process, allows you not to think about how to provide, inject, transfer an instance.

It allows you to separate business logic from view and  from preparation logic for view . I.e. **it allows you to create a separate layer of application business logic in DDD terms**.

**IMPORTANT:** 
 1. The container does not manage instance state. It does not know anything about a instance state. It only creates scope for each instance and disposes one if instance is not in use
 2. The container works with SSR, but it does not transfer state to a client from a server, because does not know about state.

## Instalation 

## Usage 

### Install the plugin

### Ctreate a provider

dsadasdd