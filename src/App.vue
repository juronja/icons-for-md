<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useDefinitionsStore } from '@/stores/definitions'

const store = useDefinitionsStore()

</script>

<template>
  <header>
    <div class="logo">
      icons-for.md
      <!-- <img alt="UTM Builder logo" src="@/assets/logo.svg" width="200" height="35" /> -->
    </div>
    <div class="search-box">
      <i class="bi bi-search"></i>
      <input v-model="store.searchText" type="search" placeholder="Search icons ..." name="Search icons ..." id="search-box">
    </div>
    <!-- <nav class="nav-desktop">
      <RouterLink to="/" title="Build">Build</RouterLink>
      <RouterLink to="/output" title="Output">Output</RouterLink>
    </nav> -->
  </header>
  <main>
    <RouterView />
  </main>
  <footer>
    <a href="https://github.com/juronja/utm-builder" target="_blank" class="github">GitHub <i class="bi bi-github"></i></a>
  </footer>
</template>

<style scoped>

.search-box {
  display: flex;
  padding: 0.5rem 1rem;
  gap: 0.5rem;
  width: 100%;
  background-color: var(--color-input-background);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  transition: 0.15s ease-in-out;
}

.search-box:focus-within {
  color: var(--color-input-text);
  outline: 0;
  border-color: var(--color-border-hover);
  box-shadow: 0 0 0 .25rem var(--color-shadow-hover);
}

.search-box input {
  background-color: transparent;
  color: var(--color-input-text);
  width: 100%;
  font-size: 1rem;
  outline: none;
  border: none;
}

.search-box input[type="search"]::-webkit-search-cancel-button {
  /* Use filter to change the color of "X" to white */
  filter: brightness(0) invert(1); /* This turns any color to black, then inverts it to white */
  cursor: pointer;
}

.search-box i {
  font-size: 1.1em;
}

.logo {
  /* display: flex;
  align-items: center; */
  color: var(--color-primary);
  font-family: "Micro 5", sans-serif;
  font-size: 3rem;
  white-space: nowrap;
}

.github {
  background-color: grey;
  padding: calc(var(--gutter-x)* .1) calc(var(--gutter-x)* .3);
  color: var(--color-button-text);
  border-radius: 0.25rem;
  font-size: 0.75rem;
}


/* Responsive layout */
@media screen and (max-width: 480px) {

  .logo {
    font-size: 1.1rem;
  }

  .search-box {
    padding: 0.3rem 0.5rem; /* Combined padding for icon and text */
    gap: 0.3rem; /* Space between icon and input */
    width: 100%;
  }

  .search-box input {
    font-size: 0.6rem;
  }

  .search-box i {
  font-size: 0.75em;
  }

  .nav-overlay {
    position: fixed;
    top: calc(var(--app-padding-top) + var(--header-height));
    right: 0;
    bottom: 0;
    left: 0;
    padding: 3rem 1.75rem;
    z-index: 1;
    background-color: var(--color-background);
    height: calc(100vh - var(--app-padding-top) - var(--header-height));
  }
}


</style>
