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
  <div class="wrapper">
    <div class="section section-box">
      <h2>Copy this link into your .md file</h2>
      <div class="output">
        <p> {{ store.generatedUrl ? store.generatedUrl : 'Select icons to generate an URL here ...' }} </p>
        <!-- add copy validation on the button -->
        <button class="button" @click="toClipboard(store.generatedUrl)"> {{ isCopied ? 'Copied!' : 'Copy' }} </button>
      </div>
    </div>
    <div class="section section-box">
      <div class="title-flex-row">
        <h2>Selected Icons</h2>
        <p>(Drag to reorder)</p>
      </div>
      <div class="selected-icons-row">
        <!-- Display selected icons visually - just images -->
        <template v-if="store.selectedIcons.length > 0">
          <ul>
            <li v-for="icon in store.selectedIcons" :key="icon" class="selected-icon-item">
              <img :src="`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/${icon}.svg`" :alt="icon" class="icon-img" />
              <span class="tag-del" @click.stop="store.removeSelectedIcon(icon)">x</span>
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

.selected-icons-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  margin: 0.25rem 0 0 0;
  min-height: 2.5rem;
}

.selected-icon-item {
  position: relative;
  display: flex; /* Kept flex for centering potential images */
  align-items: center;
  justify-content: center;
  padding: 0.2rem; /* Reduced padding */
  border: none;
  background-color: rgb(36, 41, 56);
  border-radius: 0.5rem;
  cursor: crosshair;
}

.tag-del {
  position: absolute;
  top: 0px;
  right: 0px;
  z-index: 10; /* Ensure it's above the image */
  background-color: var(--color-danger);
  color: white;
  width: 0.9rem;
  height: 0.9rem;
  align-items: center;
  justify-content: center;
  padding: 0.05rem 0.2rem;
  box-shadow: 23rem;
  font-size: 0.8rem;
  font-weight: bold;
  border-radius: 0.5rem;
  line-height: 0.9;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Horizontal-offset Vertical-offset Blur-radius Spread-radius Color */}

.available-icons-row {
  max-height: 40rem;
  overflow-y: auto;
  padding-right: 10px;
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

/* ul li:hover {
  cursor: pointer;
} */

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

.title-flex-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: baseline;
}

.title-flex-row p {
  margin-bottom: calc(var(--gutter-y)* .5);
  font-size: 0.75rem;
}


/* Responsive layout */
@media screen and (max-width: 480px) {
  .wrapper {
    grid-template-columns: auto;
  }

}


</style>
