import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

// Pet Object
/*
    1.id
    2.title
    3.isChecked
*/

const PetItem = () => {
  return (
    <View style={styles.container }>
      {/* pet icon */}
      <Pressable>  
        <MaterialCommunityIcons name="dog" size={24} color="black" />
      </Pressable>

      {/* shopping text */}
      <Text style={styles.title }> Dog Dog </Text>

      {/* delete button */}
      <Pressable> 
        <AntDesign name="delete" size={24} color="black" />
      </Pressable>
    </View>
  )
}

export default PetItem

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        backgroundColor: "lightgray",
        justifyContent: "space-between",
        padding: 10,
        alignItems: "center",
        width: "90%",
        alignSelf: "center",
        borderRadius: 10,
        marginVertical: 10,
    },
    title: {
        flex: 1,
        marginLeft: 10,
        fontSize: 17,
        fontWeight: "500",
    }
})