import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TokenHistoryItem = ({ item }) => {
  const isPositive = item.amount > 0;
  
  return (
    <View style={styles.historyItem}>
      <View style={styles.historyIcon}>
        <Icon
          name={isPositive ? 'add-circle' : 'remove-circle'}
          size={24}
          color={isPositive ? '#4CAF50' : '#F44336'}
        />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyType}>{item.type}</Text>
        <Text style={styles.historyDate}>
          {new Date(item.created_at * 1000).toLocaleDateString()}
        </Text>
      </View>
      <Text
        style={[
          styles.historyAmount,
          { color: isPositive ? '#4CAF50' : '#F44336' }
        ]}
      >
        {isPositive ? '+' : ''}{item.amount}
      </Text>
    </View>
  );
};

const TokenDisplay = ({
  balance,
  history,
  onRefresh,
  refreshing,
  onHistoryPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Token Balance</Text>
        <Text style={styles.balanceAmount}>{balance}</Text>
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Transaction History</Text>
        <FlatList
          data={history}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onHistoryPress && onHistoryPress(item)}
            >
              <TokenHistoryItem item={item} />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Icon name="history" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  balanceCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyIcon: {
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyType: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
});

export default TokenDisplay; 