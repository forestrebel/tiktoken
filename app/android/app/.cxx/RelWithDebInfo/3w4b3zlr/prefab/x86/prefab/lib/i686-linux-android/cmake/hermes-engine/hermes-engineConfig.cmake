if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/home/jon/.gradle/caches/8.10.2/transforms/3e14e4afdcf353c8f7ad85d38fcbdc28/transformed/hermes-android-0.77.0-release/prefab/modules/libhermes/libs/android.x86/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/jon/.gradle/caches/8.10.2/transforms/3e14e4afdcf353c8f7ad85d38fcbdc28/transformed/hermes-android-0.77.0-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

