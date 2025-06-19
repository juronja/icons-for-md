<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useDefinitionsStore } from '@/stores/definitions'

const store = useDefinitionsStore()

</script>

<template>
  <header>
    <div class="logo-slogan">
      <div class="logo">
        icons for md
        <!-- <img alt="UTM Builder logo" src="@/assets/logo.svg" width="200" height="35" /> -->
      </div>
      <h1>Icon reference for your markup files</h1>
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
    <div class="credits">
        <div class="credit-item">
          <p>Inspired by:</p>
          <a href="https://skillicons.dev/" target="_blank">skillicons.dev</a>
        </div>
        <div class="credit-item">
          <p>Icons source:</p>
          <a href="https://dashboardicons.com/" target="_blank">dashboardicons.com</a>
        </div>
    </div>
    <a href="https://github.com/juronja/icons-for-md" target="_blank" class="github">Github <i class="bi bi-github"></i></a>
  </footer>
</template>

<style scoped>

.search-box {
  display: flex;
  padding: 0.5rem 1rem;
  gap: 0.5rem;
  height: 3.25rem;
  width: 100%;
  background-color: var(--color-input-background);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  transition: 0.15s ease-in-out;
  align-items: center;
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

.logo-slogan {
  display: flex;
  flex-direction: column;
  align-items: center;

}

.logo {
  color: var(--color-primary);
  font-family: "Micro 5", sans-serif;
  font-size: 3.6rem;
  line-height: 2.25rem;
  padding-left: 0.2rem;
  white-space: nowrap;
}

.credits {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-size: 0.75rem;
}

.credit-item {
  display: flex;
  flex-direction: row;
  align-items: center;
}


.github {
  background-color: grey;
  padding: calc(var(--gutter-x)* .1) calc(var(--gutter-x)* .3);
  color: var(--color-button-text);
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.footer-icon {
  height: 30px;
}


/* Responsive layout */
@media screen and (max-width: 480px) {

  .search-box {
    padding: 0.3rem 0.5rem; /* Combined padding for icon and text */
    width: 100%;
    height: 3rem;
    margin-bottom: calc(var(--section-gap) / 2);
  }

  .search-box input {
    font-size: 0.8rem;
  }

  .search-box i {
  font-size: 1rem;
  }

}


</style>
