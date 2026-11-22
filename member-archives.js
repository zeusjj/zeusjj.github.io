(() => {
 const rows=data=>{if(!window.GuildAuth?.user?.isAdmin||!Array.isArray(data?.archivedMembers))return [];const index=data.headers?.indexOf('닉네임')??-1;if(index<0)return data.archivedMembers;const active=new Set((data.members??[]).map(row=>row[index]));return data.archivedMembers.filter(row=>!active.has(row[index]));};
 window.GuildMemberArchive={rows,all:data=>[...(data?.members??[]),...rows(data)],has:(data,name)=>{const index=data?.headers?.indexOf('닉네임')??-1;if(index<0||(data.members??[]).some(row=>row[index]===name))return false;return rows(data).some(row=>row[index]===name);}};
})();
