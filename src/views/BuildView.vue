<script setup>
import { onBeforeMount, ref } from 'vue'
import { useDefinitionsStore } from '@/stores/definitions'


// States
const store = useDefinitionsStore()
const isCopied = ref(false)

// Get definitions
onBeforeMount( () => {
  store.getIconNames()
})


// Copy campaign name suggestion
async function toClipboard(item) {
  if (!item == 0) {
    try {
    await navigator.clipboard.writeText(item)
    isCopied.value = true
    setTimeout(() => { isCopied.value = false }, 1000)
    console.log('Text copied:', item)
  } catch(error) {
    console.error(error)
  }
  } else {
    console.error('Nothing to copy');
  }
}


</script>

<template>
  <h1>Build your custom icon reference for .md</h1>
  <div class="wrapper">
    <div class="section section-box">
      <h2>Your Link</h2>
      <div class="output">
        <p> {{ store.generatedUrl ? store.generatedUrl : 'Select icons to generate an URL here ...' }} </p>
        <!-- add copy validation on the button -->
        <button class="button" @click="toClipboard(store.generatedUrl)"> {{ isCopied ? 'Copied!' : 'Copy' }} </button>
      </div>
    </div>
    <div class="section section-box">
      <h2>Selected Icons (Click to remove)</h2>
      <div class="selected-icons-row">
        <!-- Display selected icons visually - just images -->
        <template v-if="store.selectedIcons.length > 0">
          <ul>
            <li v-for="icon in store.selectedIcons" :key="icon" class="selected-icon-item" @click="store.removeSelectedIcon(icon)">
              <img :src="`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${icon}.svg`" :alt="icon" class="icon-img" />
            </li>
          </ul>
        </template>
        <div v-else>
          <p>No icons selected yet.</p>
        </div>
      </div>
      <hr>
      <h2>Available Icon Tags</h2>
      <div class="available-icons-row">
        <div v-if="store.isDataLoading">
          Loading definitions ...
        </div>
        <div v-else-if="store.filteredIconNames.length > 0">
          <ul>
            <li v-for="item in store.filteredIconNames.sort()" :key="item" @click="store.addSelectedIcon(item)">
              {{ item }}
            </li>
          </ul>
        </div>
        <div v-else>
          <p>No matching icons found. Try a different search query or clear the search box.</p>
        </div>
      </div>
    </div>
  </div>


</template>

<style scoped>

.wrapper {
  display: flex;
  flex-direction: column;
  /* flex-wrap: wrap;
  align-items: flex-start; */
}

.section {
  display: flex;
  flex-direction: column;
  /* flex-wrap: wrap;
  flex: 0 0 auto; */
  padding: calc(var(--gutter-x)* .5);
  margin-top: var(--section-gap);
}

.selected-icons-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  margin: 0.25rem 0 0 0;
  min-height: 2.5rem;
}

.selected-icon-item {
  /* Simplified styling for just the image */
  display: flex; /* Kept flex for centering potential images */
  align-items: center;
  justify-content: center;
  padding: 0.2rem; /* Reduced padding */
  border: none;
  background-color: rgb(36, 41, 56);
  border-radius: 0.5rem;
  cursor: pointer; /* Ensure clickability is visible */
}

.available-icons-row ul {
  justify-content: center;
}

.icon-img {
  width: 48px; /* Slightly increased size for better visibility/clickability */
  height: 48px;
  flex-shrink: 0;
}


input, select {
  padding: var(--input-padding);
  color: var(--color-input-text);
  background-color: var(--color-input-background);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  font-size: 1rem;
  transition: 0.15s ease-in-out;
}

input:focus {
  color: var(--color-input-text);
  outline: 0;
  border-color: var(--color-border-hover);
  box-shadow: 0 0 0 .25rem var(--color-shadow-hover);
}

ul {
  list-style-type: none;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
  padding: 0rem;
  gap: 0.2rem;
}

ul li {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  padding: var(--tag-padding);
  border: 1px solid var(--color-border);
  background-color: var(--color-input-background);
  border-radius: 0.25rem;
}

ul li:hover {
  cursor: pointer;
}

input, select {
  padding: var(--input-padding);
  color: var(--color-input-text);
  background-color: var(--color-input-background);
  border: 0;
}

.output-box {
  padding: 0 calc(var(--gutter-x)* .5);
}

.output {
  display: flex;
  align-items: center;
  min-height: 4rem;
  max-height: 8rem;
  overflow-x: auto; /* adds scrollbar */
  padding: var(--input-padding);
  margin-bottom: 1rem;
  background-color: var(--color-input-background);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.output p {
  box-sizing: border-box;
  width: 100%;
  margin-right: 0.75rem;

}


/* Responsive layout */
@media screen and (max-width: 480px) {
  .wrapper {
    grid-template-columns: auto;
  }

}


</style>
