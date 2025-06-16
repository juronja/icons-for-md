import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useDefinitionsStore = defineStore('definitions', () => {
  const isSaved = ref(false)
  const isDataLoading = ref(false)

  // All definitions
  const svg = ref({})

  // Icon inputs
  const searchText = ref('')
  const selectedIcons = ref([])

  // Required fields Validation
  const urlRequired = ref(false)

  function inputReq(item) {
    if (item === 'url' && inputUrl.value == 0) {
      console.error('This field is required')
      urlRequired.value = true
    }
  }


  //********* COMPUTED **********//

  const filteredIconNames = computed(() => {
    const query = searchText.value.toLowerCase().trim()

    if (!query) {
      return svg.value;
    }
    return svg.value.filter(name => name.toLowerCase().includes(query))
  })

  const generatedUrl = computed(() => {
    if (selectedIcons.value == '' ) {
        return ''
      } else {
        return (`https://icons-for-md-dev.homelabtales.com/icons?i=${selectedIcons.value.join(',')}`)
      }
  })


  //********* FUNCTIONS **********//


  // Get All Icon Names
  async function getIconNames() {
    isDataLoading.value = true
    console.log("Fetching icon names...")

    try {
      // Get data from dashboard-icons
      const response = await fetch("api/icons")
      const iconsData = await response.json()
      svg.value = iconsData
    } catch(error) {
      // isDataError.value = error.stringify() // Validation for errors you can use inside html
      console.error("Error fetching definitions:", error)
    } finally {
      isDataLoading.value = false
    }
  }

  // Add selected icon to the selectedIcons array
  function addSelectedIcon(iconName) {
    // Check if the icon is already in the selectedIcons array
    if (!selectedIcons.value.includes(iconName)) {
      selectedIcons.value.push(iconName)
      console.log(`Added icon: ${iconName}`)
    } else {
      console.log(`Icon already selected: ${iconName}`)
    }
  }

  // Remove selected icon from the selectedIcons array
  function removeSelectedIcon(iconName) {
    const index = selectedIcons.value.indexOf(iconName)
    if (index > -1) {
      selectedIcons.value.splice(index, 1)
      console.log(`Removed icon: ${iconName}`)
    }
  }



  return {
    svg,
    isSaved,
    isDataLoading,
    searchText,
    filteredIconNames,
    getIconNames,
    selectedIcons,
    generatedUrl,
    addSelectedIcon,
    removeSelectedIcon,
    urlRequired,
    inputReq
  }
})

