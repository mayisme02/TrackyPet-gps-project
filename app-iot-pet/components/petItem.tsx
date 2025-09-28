import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

// Pet Object
/*
    const [petName, setPetName] = useState("");
    const [breed, setBreed] = useState("");
    const [gender, setGender] = useState("");
    const [age, setAge] = useState("");
    const [color, setColor] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [image, setImage] = useState<string | null>(null);
*/

const PetItem = (props: 
  { title: string 
    | number 
    | bigint 
    | boolean 
    | React.ReactElement<unknown, string 
    | React.JSXElementConstructor<any>> 
    | Iterable<React.ReactNode> 
    | React.ReactPortal 
    | Promise<string 
    | number 
    | bigint 
    | boolean 
    | React.ReactPortal 
    | React.ReactElement<unknown, string 
    | React.JSXElementConstructor<any>> 
    | Iterable<React.ReactNode> 
    | null 
    | undefined> 
    | null 
    | undefined; }) => {
  return (
    <View style={styles.container }>
      {/* pet icon */}
      <Pressable>  
        <MaterialCommunityIcons name="dog" size={24} color="black" />
      </Pressable>

      {/* shopping text */}
      <Text style={styles.title}>{props.title}</Text>

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
        backgroundColor: "#D4D4D4",
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